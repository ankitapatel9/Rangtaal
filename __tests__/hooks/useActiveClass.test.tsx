import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useActiveClass } from "../../src/hooks/useActiveClass";

describe("useActiveClass", () => {
  it("starts loading and resolves to the active class doc", async () => {
    const data = {
      name: "Garba Workshops 2026",
      location: "Roselle Park District",
      address: "555 W Bryn Mawr Ave",
      dayOfWeek: "Tuesday",
      startTime: "19:30",
      endTime: "21:30",
      monthlyFee: 60,
      seasonStart: "2026-04-21T19:30:00-05:00",
      seasonEnd: "2026-09-29T19:30:00-05:00",
      active: true,
      createdAt: 1,
      createdBy: "admin1",
    };
    const getMock = jest.fn().mockResolvedValue({
      empty: false,
      docs: [{ id: "c1", data: () => data }],
    });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({ limit: jest.fn(() => ({ get: getMock })) })),
      })),
    });

    const { result } = renderHook(() => useActiveClass());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.class_?.id).toBe("c1");
    expect(result.current.class_?.name).toBe("Garba Workshops 2026");
  });

  it("resolves to null when no active class exists", async () => {
    const getMock = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({ limit: jest.fn(() => ({ get: getMock })) })),
      })),
    });

    const { result } = renderHook(() => useActiveClass());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.class_).toBeNull();
  });
});
