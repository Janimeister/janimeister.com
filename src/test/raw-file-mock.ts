// Mock for Vite's ?raw imports — returns minimal markdown with a link and a
// <details><summary> block so focus-trap tests exercise wrapping between
// multiple focusable elements (close button → link → summary).
export default '## React\n[React site](https://react.dev)\n<details>\n<summary>License</summary>\nMIT\n</details>';
