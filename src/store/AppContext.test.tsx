import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AppProvider, useAppContext } from "./AppContext";
import { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

beforeEach(() => {
  localStorage.clear();
});

describe("useAppContext", () => {
  it("throws when used outside AppProvider", () => {
    expect(() => renderHook(() => useAppContext())).toThrow(
      "useAppContext must be used within AppProvider"
    );
  });

  it("provides default clients", () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(result.current.clients.length).toBeGreaterThan(0);
  });

  it("addClient adds a client and returns it", () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    let newClient: ReturnType<typeof result.current.addClient>;
    act(() => {
      newClient = result.current.addClient({
        name: "Test User",
        email: "test@example.com",
        phone: "555-0000",
        address: "1 Test St",
        city: "London",
        country: "UK",
        company: "Test Co",
      });
    });
    expect(newClient!.id).toBeDefined();
    expect(result.current.clients.find((c) => c.id === newClient!.id)).toBeTruthy();
  });

  it("deleteClient removes the client", () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const id = result.current.clients[0].id;
    act(() => { result.current.deleteClient(id); });
    expect(result.current.clients.find((c) => c.id === id)).toBeUndefined();
  });

  it("getNextInvoiceNumber returns INV-006 when 5 invoices exist", () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(result.current.getNextInvoiceNumber()).toBe("INV-006");
  });
});
