import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("Research Map", () => {
  it("reveals an intersection and passes a term as a filter URL", () => {
    render(<App />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Machine Intelligence: Human–AI collaboration" }), { key: "Enter" });
    expect(screen.getByText("Human–AI collaboration")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View publications about Co-design" })).toHaveAttribute("href", "?dimension=methods&value=Co-design#publications");
  });
});
