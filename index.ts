import fs from "fs";
import evalAst from "./evaler";
import parse from "./parser";

console.log(JSON.stringify(evalAst(parse(fs.readFileSync(process.argv.slice(2)[0], "utf8"))), null, 4));