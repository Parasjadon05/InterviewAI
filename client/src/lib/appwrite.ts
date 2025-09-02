import { Client, Account, Databases } from 'appwrite';

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT as string)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT as string);

export const appwriteClient = client;
export const appwriteAccount = new Account(client); 
export const appwriteDatabases = new Databases(client);

// Database and Collection IDs from .env
export const APPWRITE_DB_ID = import.meta.env.VITE_APPWRITE_DB_ID as string;
export const APPWRITE_FEEDBACK_COLLECTION_ID = import.meta.env.VITE_APPWRITE_FEEDBACK_COLLECTION_ID as string; 