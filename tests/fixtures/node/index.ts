import { someFuncWithError } from '../nodeLib';

function sum() {
  let a: number = 'string';
}

class testClass {
  // print(){
  //   let a: string = 1

  // }
  // a: () => string = () => {
  //   let a: string = 1
  //   return ''
  // };
  // b: 123 = 'error';
  c: string[] = [123, function abc() {}];
}

abstract class aTest {
  abstract aPrint: () => void;
  abstract find(): string;
  a: string;
}

const testArrow = () => {
  let a: number = 'string';
};

const someClass = class {};

type TestType = {
  input1: number;
  input2: number;
};

const test: TestType = {
  input1: '123',
  input3: 555
};

type accessUnknownType = {
  input1: TestType['input3'];
};

interface IAccessUnknown {
  input1: 123;
  input2: (typeof someClass)['a'];
}
enum media {
  Newsletter = getPrintMediaCode('newsletter'),
  Magazine = Newsletter * 3,
  Newspaper = 0,
  Book
}

module abc {}

someFuncWithError();

export {};
