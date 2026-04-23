import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders login heading", () => {
  localStorage.clear();
  render(<App />);
  expect(screen.getByText(/^login$/i)).toBeInTheDocument();
});
