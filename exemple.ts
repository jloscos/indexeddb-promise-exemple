

function openDB(): Promise<IDBDatabase> {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const request = window.indexedDB.open("myDatabase");
		request.onsuccess = event => {
			resolve(request.result);
		};
		request.onerror = (event: any) => {
			reject(request.error);
		};
		request.onupgradeneeded = (event: any) => {
			//C'est ici qu'on créé ou modifie la structure de la base
			initDB(event.target.result);
		};
	});
}



function initDB(db: IDBDatabase) {
	if (!db.objectStoreNames.contains("blog")) {
		const store = db.createObjectStore("blog", { keyPath: "title" });
		store.createIndex("AuthorIndex", "author", { unique: false });
		store.createIndex("PublishDateIndex", "publishDate.getFullYear()", { unique: false });
	}
}



function setValue(db: IDBDatabase, storeName: string, value: any): Promise<Boolean> {
	return new Promise<Boolean>((resolve, reject) => {
		//On commence par ouvrir une transaction d'écriture
		const transaction: IDBTransaction = db.transaction(storeName, 'readwrite');
		const store: IDBObjectStore = transaction.objectStore(storeName);
		//La méthode put ajoute où met à jour une valeur dans la base
		const request: IDBRequest = store.put(value);
		request.onsuccess = event => {
			resolve(true);
		};
		request.onerror = (event: any) => {
			transaction.abort();
			reject(event.error);
		};
	});
}

function getValue<T>(db: IDBDatabase, storeName: string, key: any): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const transaction = db.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		const request = store.get(key);
		request.onsuccess = event => {
			resolve(request.result);
		};
		request.onerror = (event: any) => {
			reject(event.error);
		};
	});
}

function searchValues<T>(db: IDBDatabase, storeName: string, search: any): Promise<T[]> {
	const range = IDBKeyRange.lowerBound(search);
	let results = [];
	return new Promise<T[]>((resolve, reject) => {
		const transaction = db.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		const request = store.openCursor(range);
		request.onsuccess = (event:any) => {
			const cursor = event.target.result;
			if (cursor) {
				//cursor.value pointe vers la valeur en cours
				results.push(cursor.value);
				//on continue la lecture du curseur. request.onsuccess sera redéclanché pour lire la valeur suivante.
				cursor.continue();
			} else {
				//Quand on arrive ici c'est qu'il ne reste plus de valeur à lire.
				resolve(results);
			}
		};
		request.onerror = (event: any) => {
			reject(event.error);
		};
	});
}


function getByIndex<T>(db: IDBDatabase, storeName: string, indexName: string, key: any): Promise<T[]> {
	let results = [];
	return new Promise<T[]>((resolve, reject) => {
		const transaction = db.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		const index = store.index(indexName);
		//on peut aussi faire index.get si on souhaite lire qu'une seule valeur
		const request = index.openCursor(key);
		request.onsuccess = (event: any) => {
			const cursor = event.target.result;
			if (cursor) {
				results.push(cursor.value);
				cursor.continue();
			} else {
				resolve(results);
			}
		};
		request.onerror = (event: any) => {
			reject(event.error);
		};
	});
}


interface IBlogpost {
	title: string;
	publishDate: Date;
	author: string;
}


async function demo() {
	let db = await openDB();
	await setValue(db, "blog", { title: "Stockage coté client avec IndexedDB", publishDate: new Date(2018, 2, 10), author: "j.loscos" });
	await setValue(db, "blog", { title: "Faites une application offline avec le HTML 5 Application Cache", publishDate: new Date(2018, 2, 2), author: "j.loscos" });
	await setValue(db, "blog", { title: "Windows IoT par l'exemple", publishDate: new Date(2017, 10, 13), author: "pierrick.gourlain" });

	let blogPost = await getValue<IBlogpost>(db, "blog", "Windows IoT par l'exemple");

	let blogPosts = await searchValues<IBlogpost>(db, "blog", "I");
	console.log(blogPost);

	//Récupère tous les posts d'un auteur
	blogPosts = await getByIndex<IBlogpost>(db, "blog", "AuthorIndex", "j.loscos");
	console.log(blogPosts);

	//récupère tous les posts entre deux dates
	blogPosts = await getByIndex<IBlogpost>(db, "blog", "PublishDateIndex", IDBKeyRange.bound(new Date(2018, 0, 1), new Date(2018, 11, 31)));
	console.log(blogPosts);
}
