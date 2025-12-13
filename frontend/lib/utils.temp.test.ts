import { formatRelativeTime } from "./utils";

describe("formatRelativeTime", () => {
  const now = new Date();
  const oneDayAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000 - 1000
  ).toISOString(); // > 24 hours
  const twoHoursAgo = new Date(
    now.getTime() - 2 * 60 * 60 * 1000 - 1000
  ).toISOString();

  test("formats in English correctly", () => {
    // Note: date-fns might return "1 day ago" or "about 1 day ago" depending on precision
    const result = formatRelativeTime(oneDayAgo, "en");
    expect(result).toMatch(/day ago/);
  });

  test("formats in Vietnamese correctly", () => {
    const result = formatRelativeTime(oneDayAgo, "vi");
    // "1 ngày trước"
    expect(result).toMatch(/ngày trước/);
  });

  test("formats hours in Vietnamese correctly", () => {
    const result = formatRelativeTime(twoHoursAgo, "vi");
    // "khoảng 2 giờ trước" or "2 giờ trước"
    expect(result).toMatch(/giờ trước/);
  });
});
