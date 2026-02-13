export function resolveTemplate(template: string, index: number, name: string): string {
  const indexMatch = template.match(/\{index:(\d+)\}/u);
  let output = template;

  if (indexMatch) {
    const width = Number.parseInt(indexMatch[1], 10);
    output = output.replace(indexMatch[0], String(index).padStart(width, "0"));
  } else {
    output = output.replace("{index}", String(index));
  }

  output = output.replace("{name}", sanitizeName(name));
  return output;
}

export function sanitizeName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9._-]+/giu, "-");
}
