import { describe, expect, it } from "vitest";
import { JobStatus, Role } from "@domar/shared";
import en from "../../messages/en.json";

describe("shared package wiring", () => {
  it("exposes enums to the web app", () => {
    expect(Role.SUPERVISOR).toBe("SUPERVISOR");
    expect(JobStatus.OPEN).toBe("OPEN");
  });
});

describe("messages", () => {
  it("has the keys the auth flow uses", () => {
    expect(en.common.appName).toBeTruthy();
    expect(en.auth.signIn).toBeTruthy();
    expect(en.worker.greeting).toContain("{name}");
  });
});
