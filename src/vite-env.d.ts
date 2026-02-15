/// <reference types="vite/client" />

declare module "*.idl?raw" {
  const content: string;
  export default content;
}
