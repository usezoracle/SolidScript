declare module "forge-std" {
  import type { Address } from "solidscript";

  export class Test {
    constructor();
  }
}

declare const vm: {
  startPrank(account: import("solidscript").Address): void;
  stopPrank(): void;
  expectRevert(): void;
  expectRevert(selector: string): void;
  deal(account: import("solidscript").Address, value: bigint): void;
  warp(timestamp: bigint): void;
  roll(block: bigint): void;
  addr(privateKey: bigint): import("solidscript").Address;
};

declare function assertEq(a: bigint, b: bigint): void;
declare function assertEq(a: boolean, b: boolean): void;
declare function assertEq(a: import("solidscript").Address, b: import("solidscript").Address): void;
declare function assertEq(a: string, b: string): void;
declare function assertTrue(condition: boolean): void;
declare function assertFalse(condition: boolean): void;
declare function assertGt(a: bigint, b: bigint): void;
declare function assertLt(a: bigint, b: bigint): void;
