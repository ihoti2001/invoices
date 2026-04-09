// src/store/useClients.ts
import { useAppContext } from "./AppContext";

export function useClients() {
  const { loading, clients, addClient, updateClient, deleteClient } = useAppContext();
  return { loading, clients, addClient, updateClient, deleteClient };
}
