import { msg } from "solidscript";
import { ERC20 } from "solidscript/standards";

export class TrillionToken extends ERC20 {
  constructor() {
    super("TrillionToken", "TRIL");
    this._mint(msg.sender, 1000000000000n * (10n ** 18n));
  }
}
