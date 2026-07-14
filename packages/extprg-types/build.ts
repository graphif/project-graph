import { writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const APP_DIR = resolve(ROOT, "app");
const TARGET_FILE = resolve(APP_DIR, "src/core/extension/api/host.tsx");
const OUTPUT_FILE = resolve(ROOT, "packages/extprg-types/index.d.ts");
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

interface LocalDeclaration {
  readonly key: string;
  readonly symbol: ts.Symbol;
}

function isWorkspaceFile(fileName: string): boolean {
  const workspacePath = relative(ROOT, fileName);
  return (
    workspacePath !== "" && !workspacePath.startsWith(`..${sep}`) && !workspacePath.includes(`${sep}node_modules${sep}`)
  );
}

function getProgram(): ts.Program {
  const configPath = resolve(APP_DIR, "tsconfig.json");
  const config = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
      },
    },
  );
  if (!config) throw new Error(`Cannot read TypeScript configuration: ${configPath}`);
  return ts.createProgram({
    rootNames: config.fileNames,
    options: config.options,
    projectReferences: config.projectReferences,
  });
}

function findFactory(sourceFile: ts.SourceFile): ts.FunctionDeclaration {
  const factory = sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === "extensionHostApiFactory",
  );
  if (!factory) throw new Error("extensionHostApiFactory was not found");
  return factory;
}

function resolveAlias(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function getDeclarationSymbol(checker: ts.TypeChecker, type: ts.Type): ts.Symbol | undefined {
  const symbol = type.aliasSymbol ?? type.getSymbol();
  return symbol ? resolveAlias(checker, symbol) : undefined;
}

function isExportableLocalSymbol(symbol: ts.Symbol): boolean {
  return (
    symbol.declarations?.some(
      (declaration) =>
        isWorkspaceFile(declaration.getSourceFile().fileName) && declaration.getSourceFile().fileName !== TARGET_FILE,
    ) ?? false
  );
}

function isRenderableLocalSymbol(symbol: ts.Symbol): boolean {
  return !!(
    symbol.flags &
    (ts.SymbolFlags.Class |
      ts.SymbolFlags.Interface |
      ts.SymbolFlags.TypeAlias |
      ts.SymbolFlags.Enum |
      ts.SymbolFlags.Value)
  );
}

function getSymbolKey(symbol: ts.Symbol): string {
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  return `${declaration?.getSourceFile().fileName ?? "unknown"}:${symbol.name}`;
}

function printType(checker: ts.TypeChecker, type: ts.Type): string {
  const sourceFile = ts.createSourceFile("generated.d.ts", "", ts.ScriptTarget.Latest);
  const node = checker.typeToTypeNode(
    type,
    undefined,
    ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope,
  );
  return node ? printer.printNode(ts.EmitHint.Unspecified, node, sourceFile).trim() : checker.typeToString(type);
}

function isReadonly(symbol: ts.Symbol): boolean {
  return (
    symbol.declarations?.some(
      (declaration) =>
        ts.canHaveModifiers(declaration) &&
        !!ts.getModifiers(declaration)?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword),
    ) ?? false
  );
}

function typeParameters(symbol: ts.Symbol): string {
  const declaration = symbol.declarations?.find(
    (candidate): candidate is ts.ClassDeclaration | ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
      ts.isClassDeclaration(candidate) || ts.isInterfaceDeclaration(candidate) || ts.isTypeAliasDeclaration(candidate),
  );
  if (!declaration?.typeParameters?.length) return "";
  return `<${declaration.typeParameters.map((parameter) => parameter.name.text).join(", ")}>`;
}

function propertyName(symbol: ts.Symbol): string {
  return /^[$A-Z_a-z][$\w]*$/u.test(symbol.name) ? symbol.name : JSON.stringify(symbol.name);
}

function tsdoc(declaration: ts.Declaration | undefined, indentation = ""): string {
  if (!declaration) return "";
  const sourceFile = declaration.getSourceFile();
  const leadingText = sourceFile.text.slice(declaration.getFullStart(), declaration.getStart(sourceFile));
  const comments = leadingText.match(/\/\*\*[\s\S]*?\*\//gu);
  const comment = comments?.at(-1);
  if (!comment) return "";
  return `${comment
    .trim()
    .split("\n")
    .map((line) => `${indentation}${line.trim()}`)
    .join("\n")}\n`;
}

function renderObjectLikeDeclaration(checker: ts.TypeChecker, symbol: ts.Symbol, type: ts.Type): string {
  const members: string[] = [];
  for (const property of checker.getPropertiesOfType(type)) {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    if (!declaration) continue;
    const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
    const readonly = isReadonly(property) ? "readonly " : "";
    const optional = property.flags & ts.SymbolFlags.Optional ? "?" : "";
    const signatures = checker.getSignaturesOfType(propertyType, ts.SignatureKind.Call);
    if (signatures.length > 0) {
      for (const signature of signatures) {
        members.push(
          `${tsdoc(declaration, "  ")}  ${readonly}${propertyName(property)}${optional}${renderCallableSignature(checker, signature)};`,
        );
      }
      continue;
    }
    members.push(
      `${tsdoc(declaration, "  ")}  ${readonly}${propertyName(property)}${optional}: ${printType(checker, propertyType)};`,
    );
  }
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  return `${tsdoc(declaration)}declare interface ${symbol.name}${typeParameters(symbol)} {\n${members.join("\n")}\n}`;
}

function renderEnum(symbol: ts.Symbol): string {
  const declaration = symbol.declarations?.find(ts.isEnumDeclaration);
  if (!declaration) return `declare type ${symbol.name} = number;`;
  const members = declaration.members.map((member) => {
    const initializer = member.initializer ? ` = ${member.initializer.getText()}` : "";
    return `${tsdoc(member, "  ")}  ${member.name.getText()}${initializer},`;
  });
  return `${tsdoc(declaration)}declare enum ${symbol.name} {\n${members.join("\n")}\n}`;
}

function renderLocalDeclaration(checker: ts.TypeChecker, local: LocalDeclaration): string {
  const { symbol } = local;
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (!declaration) return `declare type ${symbol.name} = unknown;`;
  if (symbol.flags & ts.SymbolFlags.Enum) return renderEnum(symbol);

  const declaredType = checker.getDeclaredTypeOfSymbol(symbol);
  if (symbol.flags & ts.SymbolFlags.TypeAlias) {
    const typeAlias = symbol.declarations?.find(ts.isTypeAliasDeclaration);
    const sourceFile = typeAlias?.getSourceFile() ?? ts.createSourceFile("generated.d.ts", "", ts.ScriptTarget.Latest);
    const aliasedType = typeAlias
      ? printer.printNode(ts.EmitHint.Unspecified, typeAlias.type, sourceFile).trim()
      : printType(checker, declaredType);
    return `${tsdoc(typeAlias)}declare type ${symbol.name}${typeParameters(symbol)} = ${aliasedType};`;
  }
  if (symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface)) {
    return renderObjectLikeDeclaration(checker, symbol, declaredType);
  }
  return `${tsdoc(declaration)}declare const ${symbol.name}: ${printType(checker, checker.getTypeOfSymbolAtLocation(symbol, declaration))};`;
}

function collectLocalDeclarations(checker: ts.TypeChecker, rootType: ts.Type): LocalDeclaration[] {
  const locals = new Map<string, LocalDeclaration>();
  const visitedTypes = new Set<ts.Type>();
  const visitedNodes = new Set<ts.Node>();
  const pendingDeclarations: ts.Declaration[] = [];

  const addSymbol = (symbol: ts.Symbol): void => {
    const resolved = resolveAlias(checker, symbol);
    if (isExportableLocalSymbol(resolved) && isRenderableLocalSymbol(resolved) && !resolved.name.startsWith("__")) {
      const key = getSymbolKey(resolved);
      if (!locals.has(key)) {
        locals.set(key, { key, symbol: resolved });
        pendingDeclarations.push(...(resolved.declarations ?? []));
      }
    }
  };

  const visitNode = (node: ts.Node): void => {
    if (visitedNodes.has(node)) return;
    visitedNodes.add(node);
    if (ts.isTypeReferenceNode(node)) {
      const symbol = checker.getSymbolAtLocation(node.typeName);
      if (symbol) addSymbol(symbol);
    } else if (ts.isExpressionWithTypeArguments(node)) {
      const symbol = checker.getSymbolAtLocation(node.expression);
      if (symbol) addSymbol(symbol);
    } else if (ts.isTypeQueryNode(node)) {
      const symbol = checker.getSymbolAtLocation(node.exprName);
      if (symbol) addSymbol(symbol);
    } else if (ts.isImportTypeNode(node) && node.qualifier) {
      const symbol = checker.getSymbolAtLocation(node.qualifier);
      if (symbol) addSymbol(symbol);
    }
    ts.forEachChild(node, visitNode);
  };

  const visitType = (type: ts.Type): void => {
    if (visitedTypes.has(type)) return;
    visitedTypes.add(type);
    const symbol = getDeclarationSymbol(checker, type);
    if (symbol) {
      addSymbol(symbol);
      for (const declaration of symbol.declarations ?? []) visitNode(declaration);
    }
    if (type.isUnionOrIntersection()) type.types.forEach(visitType);
    if (type.flags & ts.TypeFlags.Object) {
      const reference = type as ts.TypeReference;
      if (reference.target) checker.getTypeArguments(reference).forEach(visitType);
    }
    type.aliasTypeArguments?.forEach(visitType);

    for (const signature of checker.getSignaturesOfType(type, ts.SignatureKind.Call)) {
      for (const parameter of signature.getParameters()) {
        const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0];
        if (declaration) visitType(checker.getTypeOfSymbolAtLocation(parameter, declaration));
      }
      visitType(checker.getReturnTypeOfSignature(signature));
    }

    for (const signature of checker.getSignaturesOfType(type, ts.SignatureKind.Construct)) {
      for (const parameter of signature.getParameters()) {
        const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0];
        if (declaration) visitType(checker.getTypeOfSymbolAtLocation(parameter, declaration));
      }
      visitType(checker.getReturnTypeOfSignature(signature));
    }
  };

  for (const property of checker.getPropertiesOfType(rootType)) {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    if (declaration) visitType(checker.getTypeOfSymbolAtLocation(property, declaration));
  }
  while (pendingDeclarations.length > 0) visitNode(pendingDeclarations.pop()!);
  return [...locals.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function externalImports(
  checker: ts.TypeChecker,
  sourceFiles: Iterable<ts.SourceFile>,
  referencedText: string,
): string[] {
  const imports = new Map<string, Set<string>>([["comlink", new Set(["ProxyMethods"])]]);
  const isReferenced = (name: string): boolean => new RegExp(`\\b${name}\\b`, "u").test(referencedText);
  for (const sourceFile of sourceFiles) {
    for (const declaration of sourceFile.statements) {
      if (!ts.isImportDeclaration(declaration) || !ts.isStringLiteral(declaration.moduleSpecifier)) continue;
      const specifier = declaration.moduleSpecifier.text;
      if (specifier.startsWith(".") || specifier.startsWith("@/") || specifier.startsWith("@graphif/")) continue;
      const clause = declaration.importClause;
      if (!clause) continue;
      const importedNames = imports.get(specifier) ?? new Set<string>();
      imports.set(specifier, importedNames);
      const moduleSymbol = checker.getSymbolAtLocation(declaration.moduleSpecifier);
      const includeModuleExports = (): void => {
        if (!moduleSymbol) return;
        for (const exportedSymbol of checker.getExportsOfModule(moduleSymbol)) {
          if (/^[A-Z_$]/u.test(exportedSymbol.name) && isReferenced(exportedSymbol.name)) {
            importedNames.add(exportedSymbol.name);
          }
        }
      };

      const defaultImport = clause.name && isReferenced(clause.name.text) ? clause.name.text : undefined;
      if (clause.name && !defaultImport) includeModuleExports();
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings) && isReferenced(bindings.name.text)) {
        importedNames.add(`* as ${bindings.name.text}`);
        continue;
      }

      if (bindings && ts.isNamespaceImport(bindings)) includeModuleExports();

      const namedImports =
        bindings && ts.isNamedImports(bindings)
          ? bindings.elements
              .filter((element) => isReferenced(element.name.text))
              .map((element) =>
                element.propertyName ? `${element.propertyName.text} as ${element.name.text}` : element.name.text,
              )
          : [];
      if (defaultImport) importedNames.add(`default:${defaultImport}`);
      for (const namedImport of namedImports) importedNames.add(namedImport);
    }
  }
  return [...imports]
    .filter(([, names]) => names.size > 0)
    .map(([specifier, names]) => {
      const defaultImport = [...names].find((name) => name.startsWith("default:"))?.slice("default:".length);
      const namespaceImport = [...names].find((name) => name.startsWith("* as "));
      if (namespaceImport) return `import type ${namespaceImport} from ${JSON.stringify(specifier)};`;
      const namedImports = [...names]
        .filter((name) => !name.startsWith("default:") && name !== defaultImport)
        .sort((left, right) => left.localeCompare(right));
      const parts = [defaultImport, namedImports.length ? `{ ${namedImports.join(", ")} }` : undefined].filter(Boolean);
      return `import type ${parts.join(", ")} from ${JSON.stringify(specifier)};`;
    })
    .sort((left, right) => left.localeCompare(right));
}

type AutoProxyReturnKind = "array" | "single";

function isProxyCall(node: ts.Node): boolean {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "proxy";
}

function containsProxyCall(node: ts.Node): boolean {
  if (isProxyCall(node)) return true;
  return ts.forEachChild(node, containsProxyCall) ?? false;
}

function autoProxyReturnKind(expression: ts.Expression): AutoProxyReturnKind | undefined {
  if (isProxyCall(expression)) return "single";
  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === "map" &&
    expression.arguments.some(containsProxyCall)
  ) {
    return "array";
  }
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    return autoProxyReturnKind(expression.expression);
  }
  if (ts.isConditionalExpression(expression)) {
    return autoProxyReturnKind(expression.whenTrue) ?? autoProxyReturnKind(expression.whenFalse);
  }
  return undefined;
}

function getAutoProxyReturnKind(body: ts.ConciseBody): AutoProxyReturnKind | undefined {
  if (!ts.isBlock(body)) return autoProxyReturnKind(body);
  let kind: AutoProxyReturnKind | undefined;
  const visit = (node: ts.Node): void => {
    if (ts.isReturnStatement(node) && node.expression) kind ??= autoProxyReturnKind(node.expression);
    ts.forEachChild(node, visit);
  };
  visit(body);
  return kind;
}

function autoProxyMethods(factory: ts.FunctionDeclaration): Map<string, AutoProxyReturnKind> {
  const methods = new Map<string, AutoProxyReturnKind>();
  const returnStatement = factory.body?.statements.find(
    (statement): statement is ts.ReturnStatement =>
      ts.isReturnStatement(statement) && !!statement.expression && ts.isObjectLiteralExpression(statement.expression),
  );
  if (!returnStatement || !returnStatement.expression || !ts.isObjectLiteralExpression(returnStatement.expression))
    return methods;

  for (const property of returnStatement.expression.properties) {
    if (!ts.isMethodDeclaration(property) || !property.name || !property.body) continue;
    const kind = getAutoProxyReturnKind(property.body);
    if (kind) methods.set(property.name.getText(), kind);
  }
  return methods;
}

function renderAutoProxyReturnType(checker: ts.TypeChecker, returnType: ts.Type, kind: AutoProxyReturnKind): string {
  const promiseSymbol = getDeclarationSymbol(checker, returnType);
  const promiseArguments =
    returnType.flags & ts.TypeFlags.Object ? checker.getTypeArguments(returnType as ts.TypeReference) : [];
  const valueType =
    promiseSymbol?.name === "Promise" && promiseArguments.length === 1 ? promiseArguments[0] : returnType;
  if (kind === "array") {
    const elementType = checker.getIndexTypeOfType(valueType, ts.IndexKind.Number);
    if (!elementType) throw new Error(`AUTO_PROXY array return is not array-like: ${checker.typeToString(valueType)}`);
    return `Array<Promise<AutoProxy<${printType(checker, elementType)}>>>`;
  }
  const remoteType = valueType.isUnion()
    ? valueType.types
        .map((member: ts.Type) =>
          member.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)
            ? printType(checker, member)
            : `AutoProxy<${printType(checker, member)}>`,
        )
        .join(" | ")
    : `AutoProxy<${printType(checker, valueType)}>`;
  return `Promise<${remoteType}>`;
}

function isPrimitiveType(type: ts.Type): boolean {
  return !!(
    type.flags &
    (ts.TypeFlags.Any |
      ts.TypeFlags.Unknown |
      ts.TypeFlags.Never |
      ts.TypeFlags.VoidLike |
      ts.TypeFlags.StringLike |
      ts.TypeFlags.NumberLike |
      ts.TypeFlags.BooleanLike |
      ts.TypeFlags.BigIntLike |
      ts.TypeFlags.ESSymbolLike |
      ts.TypeFlags.Null |
      ts.TypeFlags.Undefined)
  );
}

function isLucideType(checker: ts.TypeChecker, type: ts.Type): boolean {
  const symbol = getDeclarationSymbol(checker, type);
  if (
    symbol?.declarations?.some((declaration) =>
      declaration.getSourceFile().fileName.includes(`${sep}lucide-react${sep}`),
    )
  ) {
    return true;
  }
  const alias = symbol?.declarations?.find(ts.isTypeAliasDeclaration);
  if (!alias) return false;
  let lucide = false;
  const visit = (node: ts.Node): void => {
    if (ts.isTypeReferenceNode(node)) {
      const reference = checker.getSymbolAtLocation(node.typeName);
      const resolved = reference ? resolveAlias(checker, reference) : undefined;
      lucide ||=
        resolved?.declarations?.some((declaration) =>
          declaration.getSourceFile().fileName.includes(`${sep}lucide-react${sep}`),
        ) ?? false;
    }
    if (!lucide) ts.forEachChild(node, visit);
  };
  visit(alias.type);
  return lucide;
}

function renderExtensionInputType(checker: ts.TypeChecker, type: ts.Type): string {
  if (isPrimitiveType(type)) return printType(checker, type);
  if (type.isUnion()) {
    return type.types
      .map((member) => {
        const rendered = renderExtensionInputType(checker, member);
        return checker.getSignaturesOfType(member, ts.SignatureKind.Call).length > 0 ? `(${rendered})` : rendered;
      })
      .join(" | ");
  }
  if (isLucideType(checker, type)) return "LucideIcon";

  const symbol = getDeclarationSymbol(checker, type);
  const typeArguments = type.flags & ts.TypeFlags.Object ? checker.getTypeArguments(type as ts.TypeReference) : [];
  if ((symbol?.name === "Array" || symbol?.name === "ReadonlyArray") && typeArguments.length === 1) {
    return `Array<${renderExtensionInputType(checker, typeArguments[0])}>`;
  }
  if (symbol && symbol.name !== "__type" && !(symbol.flags & ts.SymbolFlags.Function)) {
    return `${printType(checker, type)} | SerializedObject<${JSON.stringify(symbol.name)}>`;
  }
  return printType(checker, type);
}

function renderCallableParameters(checker: ts.TypeChecker, signature: ts.Signature): string {
  return signature
    .getParameters()
    .map((parameter) => {
      const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0];
      const type = declaration ? checker.getTypeOfSymbolAtLocation(parameter, declaration) : undefined;
      const rest = declaration && ts.isParameter(declaration) && declaration.dotDotDotToken ? "..." : "";
      return `${rest}${parameter.name}${parameter.flags & ts.SymbolFlags.Optional ? "?" : ""}: ${type ? renderExtensionInputType(checker, type) : "unknown"}`;
    })
    .join(", ");
}

function renderCallableSignature(checker: ts.TypeChecker, signature: ts.Signature): string {
  return `(${renderCallableParameters(checker, signature)}): ${printType(checker, checker.getReturnTypeOfSignature(signature))}`;
}

function renderExtensionHostApi(
  checker: ts.TypeChecker,
  apiType: ts.Type,
  proxiedMethods: ReadonlyMap<string, AutoProxyReturnKind>,
): string {
  const members: string[] = [];
  for (const property of checker.getPropertiesOfType(apiType)) {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    if (!declaration) continue;
    const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
    const signature = checker.getSignaturesOfType(propertyType, ts.SignatureKind.Call)[0];
    const proxyKind = proxiedMethods.get(property.name);
    if (signature && proxyKind) {
      members.push(
        `${tsdoc(declaration, "  ")}  ${propertyName(property)}(${renderCallableParameters(checker, signature)}): ${renderAutoProxyReturnType(checker, checker.getReturnTypeOfSignature(signature), proxyKind)};`,
      );
      continue;
    }
    if (signature) {
      members.push(
        `${tsdoc(declaration, "  ")}  ${propertyName(property)}${renderCallableSignature(checker, signature)};`,
      );
      continue;
    }
    members.push(`${tsdoc(declaration, "  ")}  ${propertyName(property)}: ${printType(checker, propertyType)};`);
  }
  return `{\n${members.join("\n")}\n}`;
}

function main(): void {
  const program = getProgram();
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(TARGET_FILE);
  if (!sourceFile) throw new Error(`Source file was not included in the program: ${TARGET_FILE}`);
  const factory = findFactory(sourceFile);
  const signature = checker.getSignatureFromDeclaration(factory);
  if (!signature) throw new Error("Cannot infer extensionHostApiFactory signature");

  const apiType = checker.getReturnTypeOfSignature(signature);
  const localDeclarations = collectLocalDeclarations(checker, apiType);
  const localSourceFiles = new Map<string, ts.SourceFile>([[sourceFile.fileName, sourceFile]]);
  for (const local of localDeclarations) {
    for (const declaration of local.symbol.declarations ?? []) {
      const declarationSourceFile = declaration.getSourceFile();
      localSourceFiles.set(declarationSourceFile.fileName, declarationSourceFile);
    }
  }
  const localDeclarationText = localDeclarations.map((local) => renderLocalDeclaration(checker, local));
  const extensionHostApi = renderExtensionHostApi(checker, apiType, autoProxyMethods(factory));
  const referencedText = [...localDeclarationText, extensionHostApi].join("\n");
  const output = [
    "/* eslint-disable */",
    "/** Auto-generated from extensionHostApiFactory. Do not edit manually. */",
    ...externalImports(checker, localSourceFiles.values(), referencedText),
    "",
    ...localDeclarationText,
    "",
    "interface SerializedObject<Name extends string> {",
    "  $rpc?: { deserializeWithProject?: boolean };",
    "  _: Name | (string & {});",
    "  [key: string | number | symbol]: any;",
    "}",
    "",
    "interface LucideIcon {",
    "  $lucide: string;",
    "}",
    "",
    "type AutoProxyArrayItem<T> = T extends object ? Promise<AutoProxy<T>> : T;",
    "type AutoProxyValue<T> = T extends readonly (infer Item)[] ? AutoProxyArrayItem<Item>[] : T extends object ? AutoProxy<T> : T;",
    "type AutoProxyMethod<T> = T extends (...args: infer Args) => infer Result ? (...args: Args) => Promise<AutoProxyValue<Awaited<Result>>> : never;",
    "type AutoProxy<T> = T extends object ? { [Key in keyof T]: T[Key] extends (...args: any[]) => any ? AutoProxyMethod<T[Key]> : Promise<AutoProxyValue<T[Key]>>; } & ProxyMethods : T;",
    "",
    `export type ExtensionHostApi = ${extensionHostApi};`,
    "",
    "declare global {",
    "  const prg: ExtensionHostApi;",
    "  interface Window { prg: ExtensionHostApi; }",
    "  interface DedicatedWorkerGlobalScope { prg: ExtensionHostApi; }",
    "}",
    "",
  ].join("\n");

  writeFileSync(OUTPUT_FILE, output, "utf8");
  console.log(`Generated ${OUTPUT_FILE} with ${localDeclarations.length} workspace declarations.`);
}

main();
