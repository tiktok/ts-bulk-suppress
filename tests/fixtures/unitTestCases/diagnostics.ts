function myFunction1() {
  let a: string = 1; //.myFunction1,.myFunction1.a
}
class MyClass {
  a: string = 1; //.MyClass,.MyClass.a
}
class MyAnotherClass {
  method() {
    let a: string = 1; //.MyAnotherClass.method,.MyAnotherClass.method.a
  }
}
class MyClassWithArrowFunctionProperty {
  myProp = () => {
    let a: string = 1; //.MyClassWithArrowFunctionProperty.myProp,.MyClassWithArrowFunctionProperty.myProp.a
  };
}

type MyType = {
  1: ab; //.MyType,.MyType.ab
};
interface MyInterface {
  1: ab; //.MyInterface,.MyInterface.ab
}
enum MyEnum {
  up = () => {} //.MyEnum,.MyEnum.up
}
namespace MyNamespace {
  let a: string = 1; //.MyNamespace,.MyNamespace.a
}

//Variable Declarations
const nonAllowedNumberLiteralsVd: number = '123'; //.,.nonAllowedNumberLiteralsVd
const nonAllowedStringLiteralsVd: string = 123; //.,.nonAllowedStringLiteralsVd
const nonAllowedArrayVd: string = [123]; //.,.nonAllowedArrayVd
const allowedArrowFunctionVd = () => {
  let a: string = 1; //.allowedArrowFunctionVd,.allowedArrowFunctionVd.a
};
const allowedFunctionVd = function () {
  let a: string = 1; //.allowedFunctionVd,.allowedFunctionVd.a
};
const allowedClassExpressionVd = class {
  a: string = 1; //.allowedClassExpressionVd,.allowedClassExpressionVd.a
};
const allowedObjectLiteralVd: { abc: string } = {
  abc: 123 //.allowedObjectLiteralVd,.allowedObjectLiteralVd.abc
};

//MyClassWithDifferentProperties
class MyClassWithDifferentProperties {
  arrowFunctionProp = () => {
    let a: string = 1; //.MyClassWithDifferentProperties.arrowFunctionProp,.MyClassWithDifferentProperties.arrowFunctionProp.a
  };
  functionExpressionProp = function () {
    let a: string = 1; //.MyClassWithDifferentProperties.functionExpressionProp,.MyClassWithDifferentProperties.functionExpressionProp.a
  };
  classExpressionProp = class {
    a: string = 1; //.MyClassWithDifferentProperties.classExpressionProp,.MyClassWithDifferentProperties.classExpressionProp.a
  };
  objectLiteralProp: { abc: string } = { abc: 123 }; //.MyClassWithDifferentProperties.objectLiteralProp,.MyClassWithDifferentProperties.objectLiteralProp.abc
  nonAllowedArrayLiteralProp: string = [123]; //.MyClassWithDifferentProperties,.MyClassWithDifferentProperties.nonAllowedArrayLiteralProp
  nonAllowedProp: string = 123; //.MyClassWithDifferentProperties,.MyClassWithDifferentProperties.nonAllowedProp
}

//PropertyAssignment
const myObject: {
  objectLiteralPropAssign: { abc: string };
  nonAllowedArrayLiteralPropAssign: string[];
  nonAllowedPropAssign: string;
} = {
  arrowFunctionPropAssign: () => {
    let a: string = 1; //.myObject.arrowFunctionPropAssign,.myObject.arrowFunctionPropAssign.a
  },
  functionExpressionPropAssign: function () {
    let a: string = 1; //.myObject.functionExpressionPropAssign,.myObject.functionExpressionPropAssign.a
  },
  classExpressionPropAssign: class {
    a: string = 1; //.myObject.classExpressionPropAssign,.myObject.classExpressionPropAssign.a
  },
  objectLiteralPropAssign: {}, //.myObject.objectLiteralPropAssign,.myObject.objectLiteralPropAssign
  nonAllowedArrayLiteralPropAssign: [123], //.myObject,.myObject.nonAllowedArrayLiteralPropAssign
  nonAllowedPropAssign: 123 //.myObject,.myObject.nonAllowedPropAssign
};

type SomeObj = {
  a: string;
  b: string;
};

const someObj: SomeObj = {
  a: 'hello',
  b: 'world'
};

function accessObjPropertyFunction() {
  console.log(someObj.c); //.accessObjPropertyFunction,.accessObjPropertyFunction.someObj.c
}

export {};
