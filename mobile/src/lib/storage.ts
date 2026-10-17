import AsyncStorage from '@react-native-async-storage/async-storage';

/** Thin JSON wrapper around AsyncStorage that never throws (storage is best-effort in the demo). */
export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore: persistence is optional for the prototype
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const KEYS = {
  users: 'nasztorun.demo.users.v1',
  session: 'nasztorun.demo.session.v1',
  data: 'nasztorun.demo.data.v1',
};

