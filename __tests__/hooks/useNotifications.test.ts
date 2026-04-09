import { renderHook, act } from "@testing-library/react-native";
import { useNotifications } from "../../src/hooks/useNotifications";
import messaging from "@react-native-firebase/messaging";
import firestore from "@react-native-firebase/firestore";

describe("useNotifications", () => {
  let mockRequestPermission: jest.Mock;
  let mockGetToken: jest.Mock;
  let mockOnTokenRefresh: jest.Mock;
  let mockUpdate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequestPermission = jest.fn().mockResolvedValue(1); // AUTHORIZED
    mockGetToken = jest.fn().mockResolvedValue("mock-fcm-token");
    mockOnTokenRefresh = jest.fn(() => jest.fn());
    mockUpdate = jest.fn().mockResolvedValue(undefined);

    (messaging as unknown as jest.Mock).mockReturnValue({
      requestPermission: mockRequestPermission,
      registerDeviceForRemoteMessages: jest.fn().mockResolvedValue(undefined),
      getToken: mockGetToken,
      onTokenRefresh: mockOnTokenRefresh,
    });

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          update: mockUpdate,
        })),
      })),
    });
  });

  it("does nothing when uid is undefined", async () => {
    renderHook(() => useNotifications(undefined));
    await act(async () => {});
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it("requests permission and saves FCM token when uid is provided", async () => {
    renderHook(() => useNotifications("user-123"));
    await act(async () => {});

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(mockGetToken).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({ fcmToken: "mock-fcm-token" });
  });

  it("does not save token when permission is denied", async () => {
    mockRequestPermission.mockResolvedValue(0); // DENIED
    renderHook(() => useNotifications("user-123"));
    await act(async () => {});

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("registers onTokenRefresh and returns unsubscribe", async () => {
    const mockUnsub = jest.fn();
    mockOnTokenRefresh.mockReturnValue(mockUnsub);

    const { unmount } = renderHook(() => useNotifications("user-123"));
    await act(async () => {});

    expect(mockOnTokenRefresh).toHaveBeenCalled();
    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });

  it("updates Firestore when token refreshes", async () => {
    let refreshCallback: ((token: string) => Promise<void>) | undefined;
    mockOnTokenRefresh.mockImplementation((cb: (token: string) => Promise<void>) => {
      refreshCallback = cb;
      return jest.fn();
    });

    renderHook(() => useNotifications("user-123"));
    await act(async () => {});

    // Simulate a token refresh
    await act(async () => {
      if (refreshCallback) await refreshCallback("new-refresh-token");
    });

    expect(mockUpdate).toHaveBeenCalledWith({ fcmToken: "new-refresh-token" });
  });
});
