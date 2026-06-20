// Bun text-loader imports (`with { type: "text" }`) resolve to a string.
declare module "*.md" {
  const content: string;
  export default content;
}
declare module "*.hbs" {
  const content: string;
  export default content;
}
