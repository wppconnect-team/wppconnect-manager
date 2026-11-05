import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

it("renders with the installed React and React DOM runtimes", () => {
  expect(
    renderToStaticMarkup(
      createElement("button", { type: "button" }, "Fixture"),
    ),
  ).toBe('<button type="button">Fixture</button>');
});
