import fs from "fs";
import evalAst from "./evaler";
import parse from "./parser";

console.log(evalAst(parse(fs.readFileSync(process.argv.slice(2)[0], "utf8"))));