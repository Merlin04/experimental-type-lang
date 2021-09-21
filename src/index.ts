import fs from "fs";
import evalAst from "./evaler";
import parse from "./parser";

(async () => {
    const path = process.argv.slice(2)[0];
    console.log(await evalAst(path, parse(fs.readFileSync(path, "utf8"))));
})();