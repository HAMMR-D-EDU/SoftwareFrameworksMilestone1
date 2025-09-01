import { Injectable } from '@angular/core';

type Key = 'app:users' | 'app:groups' | 'app:channels' | 'app:session';

@Injectable({ providedIn: 'root' })
export class StorageService {
  get<T>(key: Key, fallback: T): T {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  }
  set<T>(key: Key, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
  remove(key: Key): void {
    localStorage.removeItem(key);
  }
  clear(): void {
    localStorage.clear();
  }
}