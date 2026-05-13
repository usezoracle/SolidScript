import { storage, onlyOwner } from "solidscript";

export class HasTodo {
  @storage value: bigint = 0n;

  // TODO: rate-limit this; for now anyone can call
  @onlyOwner
  setValue(v: bigint): void {
    this.value = v;
  }
}
