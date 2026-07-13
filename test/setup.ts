import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register({
  url: "http://localhost/",
})

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
})

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
