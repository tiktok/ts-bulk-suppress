function myFunction() {}
class MyClass {}
class MyAnotherClass {
  method() {}
}
class MyClassWithArrowFunctionProperty {
  myProp = () => {};
}

type MyType = {};
interface MyInterface {}
enum MyEnum {}
namespace MyNamespace {}

//Variable Declarations
const nonAllowedNumberLiteralsVd = 123;
const nonAllowedStringLiteralsVd = '123';
const nonAllowedArrayVd = [];
const allowedArrowFunctionVd = () => {};
const allowedFunctionVd = function () {};
const allowedClassExpressionVd = class {};
const allowedObjectLiteralVd = {};

//MyClassWithDifferentProperties
class MyClassWithDifferentProperties {
  arrowFunctionProp = () => {};
  functionExpressionProp = function () {};
  classExpressionProp = class {};
  objectLiteralProp = {};
  nonAllowedArrayLiteralProp = [];
  nonAllowedProp = 123;
}

//PropertyAssignment
const myObject = {
  arrowFunctionPropAssign: () => {},
  functionExpressionPropAssign: function () {},
  classExpressionPropAssign: class {},
  objectLiteralPropAssign: {},
  nonAllowedArrayLiteralPropAssign: [],
  nonAllowedPropAssign: 123
};

export {};
