import { useAppContext } from "./AppContext";

export function useClients() {
  const { clients, addClient, updateClient, deleteClient } = useAppContext();
  return { clients, addClient, updateClient, deleteClient };
}
