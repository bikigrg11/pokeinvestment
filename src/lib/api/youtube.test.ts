import { describe, it, expect, vi, afterEach } from "vitest";
import { parseChannelInput, fetchYouTubeChannels, fetchYouTubeByHandle } from "./youtube";

describe("parseChannelInput", () => {
  it("extracts a channel id from a /channel/ URL", () => {
    expect(parseChannelInput("https://youtube.com/channel/UC123abc")).toEqual({
      kind: "id",
      value: "UC123abc",
    });
  });

  it("extracts a handle from an @handle URL", () => {
    expect(parseChannelInput("https://www.youtube.com/@SomeCreator")).toEqual({
      kind: "handle",
      value: "SomeCreator",
    });
  });

  it("treats a bare @handle as a handle", () => {
    expect(parseChannelInput("@SomeCreator")).toEqual({ kind: "handle", value: "SomeCreator" });
  });

  it("treats a raw UC id as an id", () => {
    expect(parseChannelInput("UCabc123def456ghi789jkl0")).toEqual({
      kind: "id",
      value: "UCabc123def456ghi789jkl0",
    });
  });

  it("returns unknown for unrelated input", () => {
    expect(parseChannelInput("https://twitch.tv/foo").kind).toBe("unknown");
  });
});

describe("fetchYouTubeChannels", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps channels.list statistics into stats objects", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "UC123",
              snippet: { title: "Creator", thumbnails: { default: { url: "http://img" } } },
              statistics: { subscriberCount: "1000", viewCount: "50000" },
            },
          ],
        }),
      }))
    );

    const res = await fetchYouTubeChannels(["UC123"]);
    expect(res).toEqual([
      { channelId: "UC123", title: "Creator", avatarUrl: "http://img", subscribers: 1000, views: 50000 },
    ]);
  });

  it("returns [] when no api key is configured", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    expect(await fetchYouTubeChannels(["UC123"])).toEqual([]);
  });

  it("returns [] for empty id list", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    expect(await fetchYouTubeChannels([])).toEqual([]);
  });
});

describe("fetchYouTubeByHandle", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resolves a handle to channel stats via forHandle", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "UC999",
              snippet: { title: "Handled", thumbnails: { default: { url: "http://av" } } },
              statistics: { subscriberCount: "200", viewCount: "3000" },
            },
          ],
        }),
      }))
    );

    const res = await fetchYouTubeByHandle("@Handled");
    expect(res).toEqual({ channelId: "UC999", title: "Handled", avatarUrl: "http://av", subscribers: 200, views: 3000 });
  });

  it("returns null when no api key is configured", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    expect(await fetchYouTubeByHandle("@Handled")).toBeNull();
  });

  it("returns null when the handle has no match", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ items: [] }) })));
    expect(await fetchYouTubeByHandle("@nope")).toBeNull();
  });
});
