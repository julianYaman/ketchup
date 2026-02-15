import { writable, derived, get } from 'svelte/store';

const DB_NAME = 'pomodoro-todo';
const DB_VERSION = 1;
const STORE_NAME = 'todos';

export interface Todo {
	id: string;
	text: string;
	completed: boolean;
	pinned: boolean;
	createdAt: number;
}

let db: IDBDatabase | null = null;
let dbReady = false;
let pendingOperations: (() => void)[] = [];

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			reject(request.error);
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
				store.createIndex('pinned', 'pinned', { unique: false });
				store.createIndex('createdAt', 'createdAt', { unique: false });
			}
		};
	});
}

async function initDb(): Promise<void> {
	if (dbReady && db) return;

	try {
		db = await openDatabase();
		dbReady = true;
		for (const op of pendingOperations) {
			op();
		}
		pendingOperations = [];
	} catch (error) {
		console.error('Failed to open IndexedDB:', error);
	}
}

function withDb<T>(operation: (database: IDBDatabase) => IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		const execute = () => {
			if (!db) {
				reject(new Error('Database not initialized'));
				return;
			}
			const request = operation(db);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		};

		if (dbReady && db) {
			execute();
		} else {
			pendingOperations.push(execute);
		}
	});
}

async function loadAllTodos(): Promise<Todo[]> {
	await initDb();
	return withDb((database) => {
		const transaction = database.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		return store.getAll();
	});
}

async function saveTodo(todo: Todo): Promise<void> {
	await initDb();
	return withDb((database) => {
		const transaction = database.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		return store.put(todo);
	}) as unknown as Promise<void>;
}

async function deleteTodoFromDb(id: string): Promise<void> {
	await initDb();
	return withDb((database) => {
		const transaction = database.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		return store.delete(id);
	}) as unknown as Promise<void>;
}

function createTodoStore() {
	const { subscribe, set, update } = writable<Todo[]>([]);

	return {
		subscribe,

		async init() {
			try {
				const todos = await loadAllTodos();
				set(todos.sort((a, b) => b.createdAt - a.createdAt));
			} catch (error) {
				console.error('Failed to load todos:', error);
				set([]);
			}
		},

		async addTodo(text: string) {
			const todo: Todo = {
				id: generateId(),
				text: text.trim(),
				completed: false,
				pinned: false,
				createdAt: Date.now()
			};

			try {
				await saveTodo(todo);
				update(todos => [todo, ...todos]);
			} catch (error) {
				console.error('Failed to add todo:', error);
			}
		},

		async updateTodo(id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>) {
			update(todos => {
				const todo = todos.find(t => t.id === id);
				if (todo) {
					const updated = { ...todo, ...updates };
					saveTodo(updated).catch(console.error);
					return todos.map(t => (t.id === id ? updated : t));
				}
				return todos;
			});
		},

		async toggleComplete(id: string) {
			update(todos => {
				const todo = todos.find(t => t.id === id);
				if (todo) {
					const updated = { ...todo, completed: !todo.completed };
					saveTodo(updated).catch(console.error);
					return todos.map(t => (t.id === id ? updated : t));
				}
				return todos;
			});
		},

		async togglePin(id: string) {
			update(todos => {
				const todo = todos.find(t => t.id === id);
				if (todo) {
					const pinnedTodos = todos.filter(t => t.pinned && t.id !== id);
					if (!todo.pinned && pinnedTodos.length > 0) {
						pinnedTodos.forEach(t => {
							const unPinned = { ...t, pinned: false };
							saveTodo(unPinned).catch(console.error);
						});
					}
					const updated = { ...todo, pinned: !todo.pinned };
					saveTodo(updated).catch(console.error);
					return todos.map(t => {
						if (t.id === id) return updated;
						if (t.pinned && !todo.pinned) return { ...t, pinned: false };
						return t;
					});
				}
				return todos;
			});
		},

		async deleteTodo(id: string) {
			try {
				await deleteTodoFromDb(id);
				update(todos => todos.filter(t => t.id !== id));
			} catch (error) {
				console.error('Failed to delete todo:', error);
			}
		},

		getPinnedTodo(): Todo | null {
			const todos = get({ subscribe });
			return todos.find(t => t.pinned && !t.completed) || null;
		}
	};
}

export const todoStore = createTodoStore();

export const pinnedTodo = derived(todoStore, ($todos) => {
	return $todos.find(t => t.pinned && !t.completed) || null;
});