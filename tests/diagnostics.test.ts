import { Project, SyntaxKind } from 'ts-morph';
import { categorizeDiagnostics, findDiagnosticsScopeId, isAllowedNamedBlock } from '../src/tsc-bulk';
import path from 'path';

describe('findDiagnosticsNearestIdentifier', () => {
  it('should match each human calculated scopeID', () => {
    // create ts-morph Project
    const project = new Project();
    // add source files
    const sourceFile = project.addSourceFileAtPath(
      path.resolve(__dirname, 'fixtures/unitTestCases/diagnostics.ts')
    );

    const diagnostics = sourceFile.getPreEmitDiagnostics();
    diagnostics.forEach((d) => {
      const srcText = sourceFile.getText();
      const lines = srcText.split('\n');

      const lineNum = d.getLineNumber();

      if (!lineNum) throw Error('No line number found');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, refId, refIdStrict] = /\/\/(.*?),(.*)/.exec(lines[lineNum - 1]) ?? [];

      const scopeID = findDiagnosticsScopeId(d.compilerObject, false);
      const scopeIdStrict = findDiagnosticsScopeId(d.compilerObject, true);

      console.log(scopeID, scopeIdStrict);
      if (!refId) throw Error('No ref id found');
      if (!refIdStrict) throw Error('No ref id strict found');

      expect(refId).toBe(scopeID);
      expect(refIdStrict).toBe(scopeIdStrict);
    });
  });
});

describe('categorize diagnostic into correct groups', () => {
  it('errors should be categorize correctly', () => {
    const project = new Project({ tsConfigFilePath: path.resolve(__dirname, 'fixtures/node/tsconfig.json') });

    const diagnostics = project.getPreEmitDiagnostics();

    const { projectErrors, externalErrors } = categorizeDiagnostics(
      diagnostics.map((d) => d.compilerObject),
      path.resolve(__dirname, 'fixtures/node/')
    );

    expect(externalErrors.length).toBe(1);
    expect(projectErrors.length).toBe(9);
  });
});

describe('isAllowedBlock', () => {
  // create ts-morph Project
  const project = new Project();
  // add source files
  const sourceFile = project.addSourceFileAtPath(
    path.resolve(__dirname, 'fixtures/unitTestCases/declarations.ts')
  );

  describe('isAllowedBlock top-level', () => {
    it('should return true for function declaration', () => {
      const node = sourceFile.getFirstDescendantByKind(SyntaxKind.FunctionDeclaration);
      if (!node) throw 'Error, failed to fetch node';
      // assert isAllowedNamedBlock returns true
      expect(isAllowedNamedBlock(node.compilerNode)).toBe(true);
    });
    it('should return true for class declarations', () => {
      const node = sourceFile.getFirstDescendantByKind(SyntaxKind.ClassDeclaration);
      if (!node) throw 'Error, failed to fetch node';
      expect(isAllowedNamedBlock(node.compilerNode)).toBe(true);
    });
    it('should return true for method declarations', () => {
      const node = sourceFile.getFirstDescendantByKind(SyntaxKind.MethodDeclaration);
      if (!node) throw 'Error, failed to fetch node';
      expect(isAllowedNamedBlock(node.compilerNode)).toBe(true);
    });

    it('should return true for type alias declarations', () => {
      const node = sourceFile.getFirstDescendantByKind(SyntaxKind.TypeAliasDeclaration);
      if (!node) throw 'Error, failed to fetch node';

      expect(isAllowedNamedBlock(node.compilerNode)).toBe(true);
    });

    it('should return true for interface declarations', () => {
      const node = sourceFile.getFirstDescendantByKind(SyntaxKind.InterfaceDeclaration);
      if (!node) throw 'Error, failed to fetch node';

      expect(isAllowedNamedBlock(node.compilerNode)).toBe(true);
    });

    it('should return true for enum declarations', () => {
      const node = sourceFile.getFirstDescendantByKind(SyntaxKind.EnumDeclaration);
      if (!node) throw 'Error, failed to fetch node';
      expect(isAllowedNamedBlock(node.compilerNode)).toBe(true);
    });

    it('should return true for module/namespace declarations', () => {
      const node = sourceFile.getFirstDescendantByKind(SyntaxKind.ModuleDeclaration);
      if (!node) throw 'Error, failed to fetch node';
      expect(isAllowedNamedBlock(node.compilerNode)).toBe(true);
    });
  });

  describe('isAllowedBlock nested', () => {
    describe('Property Declarations', () => {
      const classNode = sourceFile
        .getDescendantsOfKind(SyntaxKind.ClassDeclaration)
        .find(
          (node) =>
            node.getChildrenOfKind(SyntaxKind.Identifier)[0].getText() === 'MyClassWithDifferentProperties'
        );

      if (!classNode) {
        throw Error('Missing classNode');
      }
      const nodes = classNode.getDescendantsOfKind(SyntaxKind.PropertyDeclaration);

      if (nodes.length !== 6) {
        console.log(nodes.length);
        throw Error('Uncovered cases');
      }

      nodes.forEach((node) => {
        if (!node) throw 'Error, failed to fetch node';

        const identifierText = node.getFirstChildByKindOrThrow(SyntaxKind.Identifier).getText();

        if (identifierText.includes('nonAllowed')) {
          it(`should return false for disallowed node ${identifierText}`, () => {
            expect(isAllowedNamedBlock(node.compilerNode)).toBe(false);
          });
        } else {
          it(`should return true for allowed node ${identifierText}`, () => {
            expect(isAllowedNamedBlock(node.compilerNode)).toBe(true);
          });
        }
      });
    });

    describe('Property Assignment', () => {
      const objectLiteralNode = sourceFile
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((node) => node.getChildrenOfKind(SyntaxKind.Identifier)[0].getText() === 'myObject')
        ?.getChildrenOfKind(SyntaxKind.ObjectLiteralExpression)[0];

      if (!objectLiteralNode) {
        throw Error('Missing objectLiteralNode');
      }
      const nodes = objectLiteralNode.getDescendantsOfKind(SyntaxKind.PropertyAssignment);

      if (nodes.length !== 6) {
        console.log(nodes.length);
        throw Error('Uncovered cases');
      }

      nodes.forEach((node) => {
        if (!node) throw 'Error, failed to fetch node';

        const identifierText = node.getFirstChildByKindOrThrow(SyntaxKind.Identifier).getText();

        if (identifierText.includes('nonAllowed')) {
          it(`should return false for disallowed node ${identifierText}`, () => {
            expect(isAllowedNamedBlock(node.compilerNode)).toBe(false);
          });
        } else {
          it(`should return true for allowed node ${identifierText}`, () => {
            expect(isAllowedNamedBlock(node.compilerNode)).toBe(true);
          });
        }
      });
    });

    describe('Variable Declarations', () => {
      const nodes = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
      if (nodes.length !== 8) {
        console.log(nodes.length);
        throw Error('Uncovered cases');
      }

      nodes.forEach((node) => {
        if (!node) throw 'Error, failed to fetch node';

        const identifierText = node.getFirstChildByKindOrThrow(SyntaxKind.Identifier).getText();

        if (identifierText.includes('nonAllowed')) {
          it(`should return false for disallowed node ${identifierText}`, () => {
            expect(isAllowedNamedBlock(node.compilerNode)).toBe(false);
          });
        } else {
          it(`should return true for allowed node ${identifierText}`, () => {
            expect(isAllowedNamedBlock(node.compilerNode)).toBe(true);
          });
        }
      });
    });
  });
});
