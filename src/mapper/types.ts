import type { IRType } from "../ir/types";

const CUSTOM_TYPE_ALIASES: Record<string, string> = {
  CheckedAddress: "address",
  Address: "address",
  Bytes32: "bytes32",
  Bytes: "bytes",
};

export function solidityType(type: IRType, location: "storage" | "memory" | "calldata" = "storage"): string {
  switch (type.kind) {
    case "primitive": {
      if (type.name === "string" && location !== "storage") return "string memory";
      if (type.name === "bytes" && location !== "storage") return "bytes memory";
      return type.name;
    }
    case "mapping":
      return `mapping(${solidityType(type.key)} => ${solidityType(type.value)})`;
    case "array": {
      const base = `${solidityType(type.element)}[]`;
      if (location !== "storage") return `${base} memory`;
      return base;
    }
    case "custom":
      return CUSTOM_TYPE_ALIASES[type.name] ?? type.name;
  }
}

export function isValueType(type: IRType): boolean {
  if (type.kind !== "primitive") return false;
  return ["uint256", "int256", "bool", "address", "bytes32"].includes(type.name);
}

export function needsLocationQualifier(type: IRType): boolean {
  if (type.kind === "array") return true;
  if (type.kind === "mapping") return true;
  if (type.kind === "primitive" && (type.name === "string" || type.name === "bytes")) return true;
  return false;
}
