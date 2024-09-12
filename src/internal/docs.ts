import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

interface DocEntry {
  name: string;
  documentation: string;
  isFunction: boolean;
  isExported: boolean;
  filePath: string;
}

function generateDocumentation(
  fileNames: string[],
  options: ts.CompilerOptions,
): DocEntry[] {
  const program = ts.createProgram(fileNames, options);
  const checker = program.getTypeChecker();
  const output: DocEntry[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      ts.forEachChild(sourceFile, visit.bind(null, sourceFile.fileName));
    }
  }

  return output;

  function visit(filePath: string, node: ts.Node) {
    const isExported = isNodeExported(node);

    if (ts.isFunctionDeclaration(node) && node.name) {
      const symbol = checker.getSymbolAtLocation(node.name);
      if (symbol) {
        output.push(serializeSymbol(symbol, true, isExported, filePath));
      }
    } else if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          const symbol = checker.getSymbolAtLocation(declaration.name);
          if (symbol) {
            output.push(
              serializeSymbol(
                symbol,
                isArrowFunction(declaration),
                isExported,
                filePath,
              ),
            );
          }
        }
      }
    }
  }

  function serializeSymbol(
    symbol: ts.Symbol,
    isFunction: boolean,
    isExported: boolean,
    filePath: string,
  ): DocEntry {
    return {
      name: symbol.getName(),
      documentation: ts.displayPartsToString(
        symbol.getDocumentationComment(checker),
      ),
      isFunction: isFunction,
      isExported: isExported,
      filePath: filePath,
    };
  }

  function isArrowFunction(node: ts.VariableDeclaration): boolean {
    return (
      node.initializer !== undefined && ts.isArrowFunction(node.initializer)
    );
  }

  function isNodeExported(node: ts.Node): boolean {
    return (
      (ts.getCombinedModifierFlags(node as ts.Declaration) &
        ts.ModifierFlags.Export) !==
        0 ||
      (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
  }
}

function generateMarkdown(docs: DocEntry[]): string {
  let markdown = "# API Documentation\n\n";

  // Group entries by file (without extension)
  const entriesByFile = docs.reduce((acc, entry) => {
    const fileName = path.basename(entry.filePath, ".ts");
    if (!acc[fileName]) {
      acc[fileName] = [];
    }
    acc[fileName].push(entry);
    return acc;
  }, {} as Record<string, DocEntry[]>);

  // Generate the summary table for each file
  for (const [fileName, entries] of Object.entries(entriesByFile)) {
    markdown += `## ${fileName}\n\n`;
    markdown += "| Function Name | Feature |\n";
    markdown += "|---------------|----------|\n";

    const exportedFunctions = entries.filter(
      (entry) => entry.isFunction && entry.isExported,
    );
    exportedFunctions.forEach((func) => {
      const feature = func.documentation.split(".")[0].trim(); // Get the first sentence of the documentation as the feature description
      markdown += `| \`${func.name}\` | ${feature} |\n`;
    });

    markdown += "\n";
  }

  return markdown;
}

function getTypeScriptFilesInDirectory(dirPath: string): string[] {
  const files = fs.readdirSync(dirPath);
  return files
    .filter((file) => file.endsWith(".ts"))
    .map((file) => path.join(dirPath, file));
}

// Parse command line arguments
const args = process.argv.slice(2);
let outputFile = "GENERATED.md";
let inputDirectory = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "-o" || args[i] === "--output") {
    outputFile = args[i + 1];
    i++; // Skip the next argument as it's the filename
  } else if (!inputDirectory) {
    inputDirectory = args[i];
  }
}

if (!inputDirectory) {
  console.error("Please provide an input directory.");
  console.error("Usage: yarn start <input-directory> [-o <output-file.md>]");
  process.exit(1);
}

const inputFiles = getTypeScriptFilesInDirectory(inputDirectory);

if (inputFiles.length === 0) {
  console.error("No TypeScript files found in the specified directory.");
  process.exit(1);
}

const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
};

const docs = generateDocumentation(inputFiles, options);
const markdown = generateMarkdown(docs);

// Write the documentation to the specified or default output file
fs.writeFileSync(outputFile, markdown);

console.log(`${outputFile} has been generated successfully.`);
