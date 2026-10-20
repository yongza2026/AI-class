import { describe, expect, it } from "vitest";
import { displayMenuCategory, menusByDisplayCategory } from "./menuCategories";

describe("메뉴 화면 분류", () => {
  it("넓은 음료 분류를 메뉴명 기준으로 보기 좋게 세분화한다", () => {
    expect(displayMenuCategory({ name: "카페라떼", category: "음료" })).toBe("커피");
    expect(displayMenuCategory({ name: "말차라떼", category: "음료" })).toBe("논커피");
    expect(displayMenuCategory({ name: "레몬에이드", category: "음료" })).toBe("에이드·주스");
  });

  it("이미 구체적인 분류는 변경하지 않는다", () => {
    expect(displayMenuCategory({ name: "시그니처 라떼", category: "시그니처" })).toBe("시그니처");
  });

  it("판매 입력용 메뉴를 화면 분류별로 묶는다", () => {
    const groups = menusByDisplayCategory([
      { menuId: "A", name: "카페라떼", category: "음료" },
      { menuId: "B", name: "에스프레소", category: "음료" },
      { menuId: "C", name: "치즈케이크", category: "디저트" },
    ]);
    expect(groups.find((group) => group.category === "커피")?.menus).toHaveLength(2);
    expect(groups.find((group) => group.category === "디저트")?.menus).toHaveLength(1);
  });
});
