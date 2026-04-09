import { sendSms } from "../sms";

const mockCreate = jest.fn().mockResolvedValue({ sid: "SM123" });

jest.mock("twilio", () => {
  return jest.fn(() => ({
    messages: {
      create: mockCreate,
    },
  }));
});

describe("sendSms", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      TWILIO_ACCOUNT_SID: "AC-test-sid",
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_FROM_NUMBER: "+15550000000",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("calls twilio messages.create with correct params", async () => {
    await sendSms("+15551234567", "Hello from Rangtaal!");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      to: "+15551234567",
      from: "+15550000000",
      body: "Hello from Rangtaal!",
    });
  });

  it("calls twilio messages.create with a different recipient and message", async () => {
    await sendSms("+15559876543", "Garba tonight at 8pm!");

    expect(mockCreate).toHaveBeenCalledWith({
      to: "+15559876543",
      from: "+15550000000",
      body: "Garba tonight at 8pm!",
    });
  });

  it("propagates errors from twilio", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Twilio error"));

    await expect(sendSms("+15551234567", "test")).rejects.toThrow("Twilio error");
  });
});
