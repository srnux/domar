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
  it("has the keys the home page uses", () => {
    expect(en.common.appName).toBeTruthy();
    expect(en.home.apiStatus).toContain("{status}");
  });
});
