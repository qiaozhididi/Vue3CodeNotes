class Vue {
  constructor(obj_instance) {
    this.$data = obj_instance.data;
    Observer(this.$data);
  }
}

//数据劫持 - 监听实例里的数据
function Observer(data_instance) {
  //递归出口
  if (!data_instance || typeof data_instance !== "object") return;
  const dependency = new Dependency();
  Object.keys(data_instance).forEach((key) => {
    let value = data_instance[key];
    Observer(value); //递归 - 子属性数据劫持
    Object.defineProperty(data_instance, key, {
      enumerable: true,
      configurable: true,
      get() {
        console.log(`访问了属性: ${key} -> 值: ${value}`);
        //订阅者加入依赖实例的数组
        Dependency.temp && dependency.addSub(Dependency.temp);
        if (Dependency.temp) {
          console.log(Dependency.temp);
        }
        return value;
      },
      set(newValue) {
        console.log(`属性${key}的值${value}修改为 -> ${newValue}`);
        value = newValue;
        Observer(newValue);
        dependency.notify();
      },
    });
  });
}

//HTML模板解析 - 替换DOM内
function Compile(element, vm) {
  vm.$el = document.querySelector(element);
  const fragment = document.createDocumentFragment();
  let child;
  while ((child = vm.$el.firstChild)) {
    fragment.append(child);
  }
  //   console.log(fragment);
  //   console.log(fragment.childNodes);
  fragment_compile(fragment);
  //替换文档碎片内容
  function fragment_compile(node) {
    const pattern = /\{\{\s*(\S+)\s*\}\}/;
    if (node.nodeType === 3) {
      const xxx = node.nodeValue;
      const result_regex = pattern.exec(node.nodeValue);
      if (result_regex) {
        // console.log(node.nodeValue);
        const arr = result_regex[1].split(".");
        const value = arr.reduce((total, current) => total[current], vm.$data);
        // console.log(vm.$data[result_regex[1]]);
        node.nodeValue = xxx.replace(pattern, value);
        // console.log(node.nodeValue);

        //创建订阅者
        new Watcher(vm, result_regex[1], (newValue) => {
          node.nodeValue = xxx.replace(pattern, newValue);
        });
      }
      return;
    }
    if (node.nodeType === 1 && node.nodeName === "INPUT") {
      const attr = Array.from(node.attributes);
      // console.log(attr);
      attr.forEach((i) => {
        if (i.nodeName === "v-model") {
          const value = i.nodeValue
            .split(".")
            .reduce((total, current) => total[current], vm.$data);
          console.log(value);
          node.value = value;
          new Watcher(vm, i.nodeValue, (newValue) => {
            node.value = newValue;
          });
          node.addEventListener("input", (e) => {
            const arr1 = i.nodeValue.split(".");
            const arr2 = arr1.split(0, arr1.length - 1);
            const final = arr2.reduce(
              (total, current) => total[current],
              vm.$data
            );
            final[arr1[arr2.length - 1]] = e.target.value;
          });
        }
      });
    }
    node.childNodes.forEach((child) => fragment_compile(child));
  }
  vm.$el.appendChild(fragment);
}

//依赖 - 收集和通知订阅者
class Dependency {
  constructor() {
    this.subscribers = [];
  }
  addSub(sub) {
    this.subscribers.push(sub);
  }
  notify() {
    this.subscribers.forEach((sub) => sub.update());
  }
}

//订阅者
class Watcher {
  constructor(vm, key, callback) {
    this.vm = vm;
    this.key = key;
    this.callback = callback;
    //临时属性 - 触发getter
    Dependency.temp = this;
    console.log(`用属性${key}创建订阅者`);
    key.split(".").reduce((total, current) => total[current], vm.$data);
    Dependency.temp = null;
  }
  update() {
    const value = this.key
      .split(".")
      .reduce((total, current) => total[current], this.vm.$data);
    this.callback();
  }
}
