var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[Object.keys(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};

// node_modules/@sveltejs/kit/dist/install-fetch.js
import http from "http";
import https from "https";
import zlib from "zlib";
import Stream, { PassThrough, pipeline } from "stream";
import { types } from "util";
import { randomBytes } from "crypto";
import { format } from "url";
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i = 1; i < meta.length; i++) {
    if (meta[i] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i]}`;
      if (meta[i].indexOf("charset=") === 0) {
        charset = meta[i].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
async function* toIterator(parts, clone3 = true) {
  for (const part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else if (ArrayBuffer.isView(part)) {
      if (clone3) {
        let position = part.byteOffset;
        const end = part.byteOffset + part.byteLength;
        while (position !== end) {
          const size = Math.min(end - position, POOL_SIZE);
          const chunk = part.buffer.slice(position, position + size);
          position += chunk.byteLength;
          yield new Uint8Array(chunk);
        }
      } else {
        yield part;
      }
    } else {
      let position = 0;
      while (position !== part.size) {
        const chunk = part.slice(position, Math.min(part.size, position + POOL_SIZE));
        const buffer = await chunk.arrayBuffer();
        position += buffer.byteLength;
        yield new Uint8Array(buffer);
      }
    }
  }
}
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    length += isBlob(value) ? value.size : Buffer.byteLength(String(value));
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
async function consumeBody(data) {
  if (data[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS$2].disturbed = true;
  if (data[INTERNALS$2].error) {
    throw data[INTERNALS$2].error;
  }
  let { body } = data;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = Stream.Readable.from(body.stream());
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof Stream)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const error2 = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(error2);
        throw error2;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error2) {
    const error_ = error2 instanceof FetchBaseError ? error2 : new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error2.message}`, "system", error2);
    throw error_;
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c) => typeof c === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error2) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error2.message}`, "system", error2);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index, array) => {
    if (index % 2 === 0) {
      result.push(array.slice(index, index + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch {
      return false;
    }
  }));
}
async function fetch(url, options_) {
  return new Promise((resolve3, reject) => {
    const request = new Request(url, options_);
    const options2 = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options2.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options2.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options2.protocol === "data:") {
      const data = dataUriToBuffer$1(request.url);
      const response2 = new Response(data, { headers: { "Content-Type": data.typeFull } });
      resolve3(response2);
      return;
    }
    const send2 = (options2.protocol === "https:" ? https : http).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error2 = new AbortError("The operation was aborted.");
      reject(error2);
      if (request.body && request.body instanceof Stream.Readable) {
        request.body.destroy(error2);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error2);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send2(options2);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (error2) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${error2.message}`, "system", error2));
      finalize();
    });
    fixResponseChunkedTransferBadEnding(request_, (error2) => {
      response.body.destroy(error2);
    });
    if (process.version < "v14") {
      request_.on("socket", (s2) => {
        let endedWithEventsCount;
        s2.prependListener("end", () => {
          endedWithEventsCount = s2._eventsCount;
        });
        s2.prependListener("close", (hadError) => {
          if (response && endedWithEventsCount < s2._eventsCount && !hadError) {
            const error2 = new Error("Premature close");
            error2.code = "ERR_STREAM_PREMATURE_CLOSE";
            response.body.emit("error", error2);
          }
        });
      });
    }
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        const locationURL = location === null ? null : new URL(location, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              headers.set("Location", locationURL);
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof Stream.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve3(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
          default:
            return reject(new TypeError(`Redirect option '${request.redirect}' is not a valid value of RequestRedirect`));
        }
      }
      if (signal) {
        response_.once("end", () => {
          signal.removeEventListener("abort", abortAndFinalize);
        });
      }
      let body = pipeline(response_, new PassThrough(), reject);
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve3(response);
        return;
      }
      const zlibOptions = {
        flush: zlib.Z_SYNC_FLUSH,
        finishFlush: zlib.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = pipeline(body, zlib.createGunzip(zlibOptions), reject);
        response = new Response(body, responseOptions);
        resolve3(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = pipeline(response_, new PassThrough(), reject);
        raw.once("data", (chunk) => {
          body = (chunk[0] & 15) === 8 ? pipeline(body, zlib.createInflate(), reject) : pipeline(body, zlib.createInflateRaw(), reject);
          response = new Response(body, responseOptions);
          resolve3(response);
        });
        return;
      }
      if (codings === "br") {
        body = pipeline(body, zlib.createBrotliDecompress(), reject);
        response = new Response(body, responseOptions);
        resolve3(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve3(response);
    });
    writeToStream(request_, request);
  });
}
function fixResponseChunkedTransferBadEnding(request, errorCallback) {
  const LAST_CHUNK = Buffer.from("0\r\n\r\n");
  let isChunkedTransfer = false;
  let properLastChunkReceived = false;
  let previousChunk;
  request.on("response", (response) => {
    const { headers } = response;
    isChunkedTransfer = headers["transfer-encoding"] === "chunked" && !headers["content-length"];
  });
  request.on("socket", (socket) => {
    const onSocketClose = () => {
      if (isChunkedTransfer && !properLastChunkReceived) {
        const error2 = new Error("Premature close");
        error2.code = "ERR_STREAM_PREMATURE_CLOSE";
        errorCallback(error2);
      }
    };
    socket.prependListener("close", onSocketClose);
    request.on("abort", () => {
      socket.removeListener("close", onSocketClose);
    });
    socket.on("data", (buf) => {
      properLastChunkReceived = Buffer.compare(buf.slice(-5), LAST_CHUNK) === 0;
      if (!properLastChunkReceived && previousChunk) {
        properLastChunkReceived = Buffer.compare(previousChunk.slice(-3), LAST_CHUNK.slice(0, 3)) === 0 && Buffer.compare(buf.slice(-2), LAST_CHUNK.slice(3)) === 0;
      }
      previousChunk = buf;
    });
  });
}
var commonjsGlobal, src, dataUriToBuffer$1, ponyfill_es2018, POOL_SIZE$1, POOL_SIZE, _parts, _type, _size, _a, _Blob, Blob2, Blob$1, FetchBaseError, FetchError, NAME, isURLSearchParameters, isBlob, isAbortSignal, carriage, dashes, carriageLength, getFooter, getBoundary, INTERNALS$2, Body, clone, extractContentType, getTotalBytes, writeToStream, validateHeaderName, validateHeaderValue, Headers, redirectStatus, isRedirect, INTERNALS$1, Response, getSearch, INTERNALS, isRequest, Request, getNodeRequestOptions, AbortError, supportedSchemas;
var init_install_fetch = __esm({
  "node_modules/@sveltejs/kit/dist/install-fetch.js"() {
    init_shims();
    commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
    src = dataUriToBuffer;
    dataUriToBuffer$1 = src;
    ponyfill_es2018 = { exports: {} };
    (function(module, exports) {
      (function(global2, factory) {
        factory(exports);
      })(commonjsGlobal, function(exports2) {
        const SymbolPolyfill = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? Symbol : (description) => `Symbol(${description})`;
        function noop4() {
          return void 0;
        }
        function getGlobals() {
          if (typeof self !== "undefined") {
            return self;
          } else if (typeof window !== "undefined") {
            return window;
          } else if (typeof commonjsGlobal !== "undefined") {
            return commonjsGlobal;
          }
          return void 0;
        }
        const globals = getGlobals();
        function typeIsObject(x) {
          return typeof x === "object" && x !== null || typeof x === "function";
        }
        const rethrowAssertionErrorRejection = noop4;
        const originalPromise = Promise;
        const originalPromiseThen = Promise.prototype.then;
        const originalPromiseResolve = Promise.resolve.bind(originalPromise);
        const originalPromiseReject = Promise.reject.bind(originalPromise);
        function newPromise(executor) {
          return new originalPromise(executor);
        }
        function promiseResolvedWith(value) {
          return originalPromiseResolve(value);
        }
        function promiseRejectedWith(reason) {
          return originalPromiseReject(reason);
        }
        function PerformPromiseThen(promise, onFulfilled, onRejected) {
          return originalPromiseThen.call(promise, onFulfilled, onRejected);
        }
        function uponPromise(promise, onFulfilled, onRejected) {
          PerformPromiseThen(PerformPromiseThen(promise, onFulfilled, onRejected), void 0, rethrowAssertionErrorRejection);
        }
        function uponFulfillment(promise, onFulfilled) {
          uponPromise(promise, onFulfilled);
        }
        function uponRejection(promise, onRejected) {
          uponPromise(promise, void 0, onRejected);
        }
        function transformPromiseWith(promise, fulfillmentHandler, rejectionHandler) {
          return PerformPromiseThen(promise, fulfillmentHandler, rejectionHandler);
        }
        function setPromiseIsHandledToTrue(promise) {
          PerformPromiseThen(promise, void 0, rethrowAssertionErrorRejection);
        }
        const queueMicrotask = (() => {
          const globalQueueMicrotask = globals && globals.queueMicrotask;
          if (typeof globalQueueMicrotask === "function") {
            return globalQueueMicrotask;
          }
          const resolvedPromise = promiseResolvedWith(void 0);
          return (fn) => PerformPromiseThen(resolvedPromise, fn);
        })();
        function reflectCall(F, V, args) {
          if (typeof F !== "function") {
            throw new TypeError("Argument is not a function");
          }
          return Function.prototype.apply.call(F, V, args);
        }
        function promiseCall(F, V, args) {
          try {
            return promiseResolvedWith(reflectCall(F, V, args));
          } catch (value) {
            return promiseRejectedWith(value);
          }
        }
        const QUEUE_MAX_ARRAY_SIZE = 16384;
        class SimpleQueue {
          constructor() {
            this._cursor = 0;
            this._size = 0;
            this._front = {
              _elements: [],
              _next: void 0
            };
            this._back = this._front;
            this._cursor = 0;
            this._size = 0;
          }
          get length() {
            return this._size;
          }
          push(element) {
            const oldBack = this._back;
            let newBack = oldBack;
            if (oldBack._elements.length === QUEUE_MAX_ARRAY_SIZE - 1) {
              newBack = {
                _elements: [],
                _next: void 0
              };
            }
            oldBack._elements.push(element);
            if (newBack !== oldBack) {
              this._back = newBack;
              oldBack._next = newBack;
            }
            ++this._size;
          }
          shift() {
            const oldFront = this._front;
            let newFront = oldFront;
            const oldCursor = this._cursor;
            let newCursor = oldCursor + 1;
            const elements = oldFront._elements;
            const element = elements[oldCursor];
            if (newCursor === QUEUE_MAX_ARRAY_SIZE) {
              newFront = oldFront._next;
              newCursor = 0;
            }
            --this._size;
            this._cursor = newCursor;
            if (oldFront !== newFront) {
              this._front = newFront;
            }
            elements[oldCursor] = void 0;
            return element;
          }
          forEach(callback) {
            let i = this._cursor;
            let node = this._front;
            let elements = node._elements;
            while (i !== elements.length || node._next !== void 0) {
              if (i === elements.length) {
                node = node._next;
                elements = node._elements;
                i = 0;
                if (elements.length === 0) {
                  break;
                }
              }
              callback(elements[i]);
              ++i;
            }
          }
          peek() {
            const front = this._front;
            const cursor = this._cursor;
            return front._elements[cursor];
          }
        }
        function ReadableStreamReaderGenericInitialize(reader, stream) {
          reader._ownerReadableStream = stream;
          stream._reader = reader;
          if (stream._state === "readable") {
            defaultReaderClosedPromiseInitialize(reader);
          } else if (stream._state === "closed") {
            defaultReaderClosedPromiseInitializeAsResolved(reader);
          } else {
            defaultReaderClosedPromiseInitializeAsRejected(reader, stream._storedError);
          }
        }
        function ReadableStreamReaderGenericCancel(reader, reason) {
          const stream = reader._ownerReadableStream;
          return ReadableStreamCancel(stream, reason);
        }
        function ReadableStreamReaderGenericRelease(reader) {
          if (reader._ownerReadableStream._state === "readable") {
            defaultReaderClosedPromiseReject(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
          } else {
            defaultReaderClosedPromiseResetToRejected(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
          }
          reader._ownerReadableStream._reader = void 0;
          reader._ownerReadableStream = void 0;
        }
        function readerLockException(name) {
          return new TypeError("Cannot " + name + " a stream using a released reader");
        }
        function defaultReaderClosedPromiseInitialize(reader) {
          reader._closedPromise = newPromise((resolve3, reject) => {
            reader._closedPromise_resolve = resolve3;
            reader._closedPromise_reject = reject;
          });
        }
        function defaultReaderClosedPromiseInitializeAsRejected(reader, reason) {
          defaultReaderClosedPromiseInitialize(reader);
          defaultReaderClosedPromiseReject(reader, reason);
        }
        function defaultReaderClosedPromiseInitializeAsResolved(reader) {
          defaultReaderClosedPromiseInitialize(reader);
          defaultReaderClosedPromiseResolve(reader);
        }
        function defaultReaderClosedPromiseReject(reader, reason) {
          if (reader._closedPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(reader._closedPromise);
          reader._closedPromise_reject(reason);
          reader._closedPromise_resolve = void 0;
          reader._closedPromise_reject = void 0;
        }
        function defaultReaderClosedPromiseResetToRejected(reader, reason) {
          defaultReaderClosedPromiseInitializeAsRejected(reader, reason);
        }
        function defaultReaderClosedPromiseResolve(reader) {
          if (reader._closedPromise_resolve === void 0) {
            return;
          }
          reader._closedPromise_resolve(void 0);
          reader._closedPromise_resolve = void 0;
          reader._closedPromise_reject = void 0;
        }
        const AbortSteps = SymbolPolyfill("[[AbortSteps]]");
        const ErrorSteps = SymbolPolyfill("[[ErrorSteps]]");
        const CancelSteps = SymbolPolyfill("[[CancelSteps]]");
        const PullSteps = SymbolPolyfill("[[PullSteps]]");
        const NumberIsFinite = Number.isFinite || function(x) {
          return typeof x === "number" && isFinite(x);
        };
        const MathTrunc = Math.trunc || function(v) {
          return v < 0 ? Math.ceil(v) : Math.floor(v);
        };
        function isDictionary(x) {
          return typeof x === "object" || typeof x === "function";
        }
        function assertDictionary(obj, context) {
          if (obj !== void 0 && !isDictionary(obj)) {
            throw new TypeError(`${context} is not an object.`);
          }
        }
        function assertFunction(x, context) {
          if (typeof x !== "function") {
            throw new TypeError(`${context} is not a function.`);
          }
        }
        function isObject(x) {
          return typeof x === "object" && x !== null || typeof x === "function";
        }
        function assertObject(x, context) {
          if (!isObject(x)) {
            throw new TypeError(`${context} is not an object.`);
          }
        }
        function assertRequiredArgument(x, position, context) {
          if (x === void 0) {
            throw new TypeError(`Parameter ${position} is required in '${context}'.`);
          }
        }
        function assertRequiredField(x, field, context) {
          if (x === void 0) {
            throw new TypeError(`${field} is required in '${context}'.`);
          }
        }
        function convertUnrestrictedDouble(value) {
          return Number(value);
        }
        function censorNegativeZero(x) {
          return x === 0 ? 0 : x;
        }
        function integerPart(x) {
          return censorNegativeZero(MathTrunc(x));
        }
        function convertUnsignedLongLongWithEnforceRange(value, context) {
          const lowerBound = 0;
          const upperBound = Number.MAX_SAFE_INTEGER;
          let x = Number(value);
          x = censorNegativeZero(x);
          if (!NumberIsFinite(x)) {
            throw new TypeError(`${context} is not a finite number`);
          }
          x = integerPart(x);
          if (x < lowerBound || x > upperBound) {
            throw new TypeError(`${context} is outside the accepted range of ${lowerBound} to ${upperBound}, inclusive`);
          }
          if (!NumberIsFinite(x) || x === 0) {
            return 0;
          }
          return x;
        }
        function assertReadableStream(x, context) {
          if (!IsReadableStream(x)) {
            throw new TypeError(`${context} is not a ReadableStream.`);
          }
        }
        function AcquireReadableStreamDefaultReader(stream) {
          return new ReadableStreamDefaultReader(stream);
        }
        function ReadableStreamAddReadRequest(stream, readRequest) {
          stream._reader._readRequests.push(readRequest);
        }
        function ReadableStreamFulfillReadRequest(stream, chunk, done) {
          const reader = stream._reader;
          const readRequest = reader._readRequests.shift();
          if (done) {
            readRequest._closeSteps();
          } else {
            readRequest._chunkSteps(chunk);
          }
        }
        function ReadableStreamGetNumReadRequests(stream) {
          return stream._reader._readRequests.length;
        }
        function ReadableStreamHasDefaultReader(stream) {
          const reader = stream._reader;
          if (reader === void 0) {
            return false;
          }
          if (!IsReadableStreamDefaultReader(reader)) {
            return false;
          }
          return true;
        }
        class ReadableStreamDefaultReader {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "ReadableStreamDefaultReader");
            assertReadableStream(stream, "First parameter");
            if (IsReadableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive reading by another reader");
            }
            ReadableStreamReaderGenericInitialize(this, stream);
            this._readRequests = new SimpleQueue();
          }
          get closed() {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          cancel(reason = void 0) {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("cancel"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("cancel"));
            }
            return ReadableStreamReaderGenericCancel(this, reason);
          }
          read() {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("read"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("read from"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve3, reject) => {
              resolvePromise = resolve3;
              rejectPromise = reject;
            });
            const readRequest = {
              _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
              _closeSteps: () => resolvePromise({ value: void 0, done: true }),
              _errorSteps: (e) => rejectPromise(e)
            };
            ReadableStreamDefaultReaderRead(this, readRequest);
            return promise;
          }
          releaseLock() {
            if (!IsReadableStreamDefaultReader(this)) {
              throw defaultReaderBrandCheckException("releaseLock");
            }
            if (this._ownerReadableStream === void 0) {
              return;
            }
            if (this._readRequests.length > 0) {
              throw new TypeError("Tried to release a reader lock when that reader has pending read() calls un-settled");
            }
            ReadableStreamReaderGenericRelease(this);
          }
        }
        Object.defineProperties(ReadableStreamDefaultReader.prototype, {
          cancel: { enumerable: true },
          read: { enumerable: true },
          releaseLock: { enumerable: true },
          closed: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamDefaultReader.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamDefaultReader",
            configurable: true
          });
        }
        function IsReadableStreamDefaultReader(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readRequests")) {
            return false;
          }
          return x instanceof ReadableStreamDefaultReader;
        }
        function ReadableStreamDefaultReaderRead(reader, readRequest) {
          const stream = reader._ownerReadableStream;
          stream._disturbed = true;
          if (stream._state === "closed") {
            readRequest._closeSteps();
          } else if (stream._state === "errored") {
            readRequest._errorSteps(stream._storedError);
          } else {
            stream._readableStreamController[PullSteps](readRequest);
          }
        }
        function defaultReaderBrandCheckException(name) {
          return new TypeError(`ReadableStreamDefaultReader.prototype.${name} can only be used on a ReadableStreamDefaultReader`);
        }
        const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () {
        }).prototype);
        class ReadableStreamAsyncIteratorImpl {
          constructor(reader, preventCancel) {
            this._ongoingPromise = void 0;
            this._isFinished = false;
            this._reader = reader;
            this._preventCancel = preventCancel;
          }
          next() {
            const nextSteps = () => this._nextSteps();
            this._ongoingPromise = this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, nextSteps, nextSteps) : nextSteps();
            return this._ongoingPromise;
          }
          return(value) {
            const returnSteps = () => this._returnSteps(value);
            return this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, returnSteps, returnSteps) : returnSteps();
          }
          _nextSteps() {
            if (this._isFinished) {
              return Promise.resolve({ value: void 0, done: true });
            }
            const reader = this._reader;
            if (reader._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("iterate"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve3, reject) => {
              resolvePromise = resolve3;
              rejectPromise = reject;
            });
            const readRequest = {
              _chunkSteps: (chunk) => {
                this._ongoingPromise = void 0;
                queueMicrotask(() => resolvePromise({ value: chunk, done: false }));
              },
              _closeSteps: () => {
                this._ongoingPromise = void 0;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                resolvePromise({ value: void 0, done: true });
              },
              _errorSteps: (reason) => {
                this._ongoingPromise = void 0;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                rejectPromise(reason);
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
            return promise;
          }
          _returnSteps(value) {
            if (this._isFinished) {
              return Promise.resolve({ value, done: true });
            }
            this._isFinished = true;
            const reader = this._reader;
            if (reader._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("finish iterating"));
            }
            if (!this._preventCancel) {
              const result = ReadableStreamReaderGenericCancel(reader, value);
              ReadableStreamReaderGenericRelease(reader);
              return transformPromiseWith(result, () => ({ value, done: true }));
            }
            ReadableStreamReaderGenericRelease(reader);
            return promiseResolvedWith({ value, done: true });
          }
        }
        const ReadableStreamAsyncIteratorPrototype = {
          next() {
            if (!IsReadableStreamAsyncIterator(this)) {
              return promiseRejectedWith(streamAsyncIteratorBrandCheckException("next"));
            }
            return this._asyncIteratorImpl.next();
          },
          return(value) {
            if (!IsReadableStreamAsyncIterator(this)) {
              return promiseRejectedWith(streamAsyncIteratorBrandCheckException("return"));
            }
            return this._asyncIteratorImpl.return(value);
          }
        };
        if (AsyncIteratorPrototype !== void 0) {
          Object.setPrototypeOf(ReadableStreamAsyncIteratorPrototype, AsyncIteratorPrototype);
        }
        function AcquireReadableStreamAsyncIterator(stream, preventCancel) {
          const reader = AcquireReadableStreamDefaultReader(stream);
          const impl = new ReadableStreamAsyncIteratorImpl(reader, preventCancel);
          const iterator = Object.create(ReadableStreamAsyncIteratorPrototype);
          iterator._asyncIteratorImpl = impl;
          return iterator;
        }
        function IsReadableStreamAsyncIterator(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_asyncIteratorImpl")) {
            return false;
          }
          try {
            return x._asyncIteratorImpl instanceof ReadableStreamAsyncIteratorImpl;
          } catch (_a2) {
            return false;
          }
        }
        function streamAsyncIteratorBrandCheckException(name) {
          return new TypeError(`ReadableStreamAsyncIterator.${name} can only be used on a ReadableSteamAsyncIterator`);
        }
        const NumberIsNaN = Number.isNaN || function(x) {
          return x !== x;
        };
        function CreateArrayFromList(elements) {
          return elements.slice();
        }
        function CopyDataBlockBytes(dest, destOffset, src2, srcOffset, n) {
          new Uint8Array(dest).set(new Uint8Array(src2, srcOffset, n), destOffset);
        }
        function TransferArrayBuffer(O) {
          return O;
        }
        function IsDetachedBuffer(O) {
          return false;
        }
        function ArrayBufferSlice(buffer, begin, end) {
          if (buffer.slice) {
            return buffer.slice(begin, end);
          }
          const length = end - begin;
          const slice = new ArrayBuffer(length);
          CopyDataBlockBytes(slice, 0, buffer, begin, length);
          return slice;
        }
        function IsNonNegativeNumber(v) {
          if (typeof v !== "number") {
            return false;
          }
          if (NumberIsNaN(v)) {
            return false;
          }
          if (v < 0) {
            return false;
          }
          return true;
        }
        function CloneAsUint8Array(O) {
          const buffer = ArrayBufferSlice(O.buffer, O.byteOffset, O.byteOffset + O.byteLength);
          return new Uint8Array(buffer);
        }
        function DequeueValue(container) {
          const pair = container._queue.shift();
          container._queueTotalSize -= pair.size;
          if (container._queueTotalSize < 0) {
            container._queueTotalSize = 0;
          }
          return pair.value;
        }
        function EnqueueValueWithSize(container, value, size) {
          if (!IsNonNegativeNumber(size) || size === Infinity) {
            throw new RangeError("Size must be a finite, non-NaN, non-negative number.");
          }
          container._queue.push({ value, size });
          container._queueTotalSize += size;
        }
        function PeekQueueValue(container) {
          const pair = container._queue.peek();
          return pair.value;
        }
        function ResetQueue(container) {
          container._queue = new SimpleQueue();
          container._queueTotalSize = 0;
        }
        class ReadableStreamBYOBRequest {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get view() {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("view");
            }
            return this._view;
          }
          respond(bytesWritten) {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("respond");
            }
            assertRequiredArgument(bytesWritten, 1, "respond");
            bytesWritten = convertUnsignedLongLongWithEnforceRange(bytesWritten, "First parameter");
            if (this._associatedReadableByteStreamController === void 0) {
              throw new TypeError("This BYOB request has been invalidated");
            }
            if (IsDetachedBuffer(this._view.buffer))
              ;
            ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
          }
          respondWithNewView(view) {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("respondWithNewView");
            }
            assertRequiredArgument(view, 1, "respondWithNewView");
            if (!ArrayBuffer.isView(view)) {
              throw new TypeError("You can only respond with array buffer views");
            }
            if (this._associatedReadableByteStreamController === void 0) {
              throw new TypeError("This BYOB request has been invalidated");
            }
            if (IsDetachedBuffer(view.buffer))
              ;
            ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
          }
        }
        Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
          respond: { enumerable: true },
          respondWithNewView: { enumerable: true },
          view: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamBYOBRequest.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamBYOBRequest",
            configurable: true
          });
        }
        class ReadableByteStreamController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get byobRequest() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("byobRequest");
            }
            return ReadableByteStreamControllerGetBYOBRequest(this);
          }
          get desiredSize() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("desiredSize");
            }
            return ReadableByteStreamControllerGetDesiredSize(this);
          }
          close() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("close");
            }
            if (this._closeRequested) {
              throw new TypeError("The stream has already been closed; do not close it again!");
            }
            const state = this._controlledReadableByteStream._state;
            if (state !== "readable") {
              throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be closed`);
            }
            ReadableByteStreamControllerClose(this);
          }
          enqueue(chunk) {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("enqueue");
            }
            assertRequiredArgument(chunk, 1, "enqueue");
            if (!ArrayBuffer.isView(chunk)) {
              throw new TypeError("chunk must be an array buffer view");
            }
            if (chunk.byteLength === 0) {
              throw new TypeError("chunk must have non-zero byteLength");
            }
            if (chunk.buffer.byteLength === 0) {
              throw new TypeError(`chunk's buffer must have non-zero byteLength`);
            }
            if (this._closeRequested) {
              throw new TypeError("stream is closed or draining");
            }
            const state = this._controlledReadableByteStream._state;
            if (state !== "readable") {
              throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be enqueued to`);
            }
            ReadableByteStreamControllerEnqueue(this, chunk);
          }
          error(e = void 0) {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("error");
            }
            ReadableByteStreamControllerError(this, e);
          }
          [CancelSteps](reason) {
            ReadableByteStreamControllerClearPendingPullIntos(this);
            ResetQueue(this);
            const result = this._cancelAlgorithm(reason);
            ReadableByteStreamControllerClearAlgorithms(this);
            return result;
          }
          [PullSteps](readRequest) {
            const stream = this._controlledReadableByteStream;
            if (this._queueTotalSize > 0) {
              const entry = this._queue.shift();
              this._queueTotalSize -= entry.byteLength;
              ReadableByteStreamControllerHandleQueueDrain(this);
              const view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
              readRequest._chunkSteps(view);
              return;
            }
            const autoAllocateChunkSize = this._autoAllocateChunkSize;
            if (autoAllocateChunkSize !== void 0) {
              let buffer;
              try {
                buffer = new ArrayBuffer(autoAllocateChunkSize);
              } catch (bufferE) {
                readRequest._errorSteps(bufferE);
                return;
              }
              const pullIntoDescriptor = {
                buffer,
                bufferByteLength: autoAllocateChunkSize,
                byteOffset: 0,
                byteLength: autoAllocateChunkSize,
                bytesFilled: 0,
                elementSize: 1,
                viewConstructor: Uint8Array,
                readerType: "default"
              };
              this._pendingPullIntos.push(pullIntoDescriptor);
            }
            ReadableStreamAddReadRequest(stream, readRequest);
            ReadableByteStreamControllerCallPullIfNeeded(this);
          }
        }
        Object.defineProperties(ReadableByteStreamController.prototype, {
          close: { enumerable: true },
          enqueue: { enumerable: true },
          error: { enumerable: true },
          byobRequest: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableByteStreamController.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableByteStreamController",
            configurable: true
          });
        }
        function IsReadableByteStreamController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledReadableByteStream")) {
            return false;
          }
          return x instanceof ReadableByteStreamController;
        }
        function IsReadableStreamBYOBRequest(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_associatedReadableByteStreamController")) {
            return false;
          }
          return x instanceof ReadableStreamBYOBRequest;
        }
        function ReadableByteStreamControllerCallPullIfNeeded(controller) {
          const shouldPull = ReadableByteStreamControllerShouldCallPull(controller);
          if (!shouldPull) {
            return;
          }
          if (controller._pulling) {
            controller._pullAgain = true;
            return;
          }
          controller._pulling = true;
          const pullPromise = controller._pullAlgorithm();
          uponPromise(pullPromise, () => {
            controller._pulling = false;
            if (controller._pullAgain) {
              controller._pullAgain = false;
              ReadableByteStreamControllerCallPullIfNeeded(controller);
            }
          }, (e) => {
            ReadableByteStreamControllerError(controller, e);
          });
        }
        function ReadableByteStreamControllerClearPendingPullIntos(controller) {
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          controller._pendingPullIntos = new SimpleQueue();
        }
        function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
          let done = false;
          if (stream._state === "closed") {
            done = true;
          }
          const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
          if (pullIntoDescriptor.readerType === "default") {
            ReadableStreamFulfillReadRequest(stream, filledView, done);
          } else {
            ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
          }
        }
        function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
          const bytesFilled = pullIntoDescriptor.bytesFilled;
          const elementSize = pullIntoDescriptor.elementSize;
          return new pullIntoDescriptor.viewConstructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
        }
        function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
          controller._queue.push({ buffer, byteOffset, byteLength });
          controller._queueTotalSize += byteLength;
        }
        function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
          const elementSize = pullIntoDescriptor.elementSize;
          const currentAlignedBytes = pullIntoDescriptor.bytesFilled - pullIntoDescriptor.bytesFilled % elementSize;
          const maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
          const maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
          const maxAlignedBytes = maxBytesFilled - maxBytesFilled % elementSize;
          let totalBytesToCopyRemaining = maxBytesToCopy;
          let ready = false;
          if (maxAlignedBytes > currentAlignedBytes) {
            totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
            ready = true;
          }
          const queue = controller._queue;
          while (totalBytesToCopyRemaining > 0) {
            const headOfQueue = queue.peek();
            const bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
            const destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
            CopyDataBlockBytes(pullIntoDescriptor.buffer, destStart, headOfQueue.buffer, headOfQueue.byteOffset, bytesToCopy);
            if (headOfQueue.byteLength === bytesToCopy) {
              queue.shift();
            } else {
              headOfQueue.byteOffset += bytesToCopy;
              headOfQueue.byteLength -= bytesToCopy;
            }
            controller._queueTotalSize -= bytesToCopy;
            ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesToCopy, pullIntoDescriptor);
            totalBytesToCopyRemaining -= bytesToCopy;
          }
          return ready;
        }
        function ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, size, pullIntoDescriptor) {
          pullIntoDescriptor.bytesFilled += size;
        }
        function ReadableByteStreamControllerHandleQueueDrain(controller) {
          if (controller._queueTotalSize === 0 && controller._closeRequested) {
            ReadableByteStreamControllerClearAlgorithms(controller);
            ReadableStreamClose(controller._controlledReadableByteStream);
          } else {
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }
        }
        function ReadableByteStreamControllerInvalidateBYOBRequest(controller) {
          if (controller._byobRequest === null) {
            return;
          }
          controller._byobRequest._associatedReadableByteStreamController = void 0;
          controller._byobRequest._view = null;
          controller._byobRequest = null;
        }
        function ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller) {
          while (controller._pendingPullIntos.length > 0) {
            if (controller._queueTotalSize === 0) {
              return;
            }
            const pullIntoDescriptor = controller._pendingPullIntos.peek();
            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
              ReadableByteStreamControllerShiftPendingPullInto(controller);
              ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
            }
          }
        }
        function ReadableByteStreamControllerPullInto(controller, view, readIntoRequest) {
          const stream = controller._controlledReadableByteStream;
          let elementSize = 1;
          if (view.constructor !== DataView) {
            elementSize = view.constructor.BYTES_PER_ELEMENT;
          }
          const ctor = view.constructor;
          const buffer = TransferArrayBuffer(view.buffer);
          const pullIntoDescriptor = {
            buffer,
            bufferByteLength: buffer.byteLength,
            byteOffset: view.byteOffset,
            byteLength: view.byteLength,
            bytesFilled: 0,
            elementSize,
            viewConstructor: ctor,
            readerType: "byob"
          };
          if (controller._pendingPullIntos.length > 0) {
            controller._pendingPullIntos.push(pullIntoDescriptor);
            ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
            return;
          }
          if (stream._state === "closed") {
            const emptyView = new ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
            readIntoRequest._closeSteps(emptyView);
            return;
          }
          if (controller._queueTotalSize > 0) {
            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
              const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
              ReadableByteStreamControllerHandleQueueDrain(controller);
              readIntoRequest._chunkSteps(filledView);
              return;
            }
            if (controller._closeRequested) {
              const e = new TypeError("Insufficient bytes to fill elements in the given buffer");
              ReadableByteStreamControllerError(controller, e);
              readIntoRequest._errorSteps(e);
              return;
            }
          }
          controller._pendingPullIntos.push(pullIntoDescriptor);
          ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor) {
          const stream = controller._controlledReadableByteStream;
          if (ReadableStreamHasBYOBReader(stream)) {
            while (ReadableStreamGetNumReadIntoRequests(stream) > 0) {
              const pullIntoDescriptor = ReadableByteStreamControllerShiftPendingPullInto(controller);
              ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor);
            }
          }
        }
        function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
          ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
          if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.elementSize) {
            return;
          }
          ReadableByteStreamControllerShiftPendingPullInto(controller);
          const remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
          if (remainderSize > 0) {
            const end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
            const remainder = ArrayBufferSlice(pullIntoDescriptor.buffer, end - remainderSize, end);
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, remainder, 0, remainder.byteLength);
          }
          pullIntoDescriptor.bytesFilled -= remainderSize;
          ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
          ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
        }
        function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            ReadableByteStreamControllerRespondInClosedState(controller);
          } else {
            ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
          }
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerShiftPendingPullInto(controller) {
          const descriptor = controller._pendingPullIntos.shift();
          return descriptor;
        }
        function ReadableByteStreamControllerShouldCallPull(controller) {
          const stream = controller._controlledReadableByteStream;
          if (stream._state !== "readable") {
            return false;
          }
          if (controller._closeRequested) {
            return false;
          }
          if (!controller._started) {
            return false;
          }
          if (ReadableStreamHasDefaultReader(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            return true;
          }
          if (ReadableStreamHasBYOBReader(stream) && ReadableStreamGetNumReadIntoRequests(stream) > 0) {
            return true;
          }
          const desiredSize = ReadableByteStreamControllerGetDesiredSize(controller);
          if (desiredSize > 0) {
            return true;
          }
          return false;
        }
        function ReadableByteStreamControllerClearAlgorithms(controller) {
          controller._pullAlgorithm = void 0;
          controller._cancelAlgorithm = void 0;
        }
        function ReadableByteStreamControllerClose(controller) {
          const stream = controller._controlledReadableByteStream;
          if (controller._closeRequested || stream._state !== "readable") {
            return;
          }
          if (controller._queueTotalSize > 0) {
            controller._closeRequested = true;
            return;
          }
          if (controller._pendingPullIntos.length > 0) {
            const firstPendingPullInto = controller._pendingPullIntos.peek();
            if (firstPendingPullInto.bytesFilled > 0) {
              const e = new TypeError("Insufficient bytes to fill elements in the given buffer");
              ReadableByteStreamControllerError(controller, e);
              throw e;
            }
          }
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamClose(stream);
        }
        function ReadableByteStreamControllerEnqueue(controller, chunk) {
          const stream = controller._controlledReadableByteStream;
          if (controller._closeRequested || stream._state !== "readable") {
            return;
          }
          const buffer = chunk.buffer;
          const byteOffset = chunk.byteOffset;
          const byteLength = chunk.byteLength;
          const transferredBuffer = TransferArrayBuffer(buffer);
          if (controller._pendingPullIntos.length > 0) {
            const firstPendingPullInto = controller._pendingPullIntos.peek();
            if (IsDetachedBuffer(firstPendingPullInto.buffer))
              ;
            firstPendingPullInto.buffer = TransferArrayBuffer(firstPendingPullInto.buffer);
          }
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          if (ReadableStreamHasDefaultReader(stream)) {
            if (ReadableStreamGetNumReadRequests(stream) === 0) {
              ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
            } else {
              const transferredView = new Uint8Array(transferredBuffer, byteOffset, byteLength);
              ReadableStreamFulfillReadRequest(stream, transferredView, false);
            }
          } else if (ReadableStreamHasBYOBReader(stream)) {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
            ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
          } else {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
          }
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerError(controller, e) {
          const stream = controller._controlledReadableByteStream;
          if (stream._state !== "readable") {
            return;
          }
          ReadableByteStreamControllerClearPendingPullIntos(controller);
          ResetQueue(controller);
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamError(stream, e);
        }
        function ReadableByteStreamControllerGetBYOBRequest(controller) {
          if (controller._byobRequest === null && controller._pendingPullIntos.length > 0) {
            const firstDescriptor = controller._pendingPullIntos.peek();
            const view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
            const byobRequest = Object.create(ReadableStreamBYOBRequest.prototype);
            SetUpReadableStreamBYOBRequest(byobRequest, controller, view);
            controller._byobRequest = byobRequest;
          }
          return controller._byobRequest;
        }
        function ReadableByteStreamControllerGetDesiredSize(controller) {
          const state = controller._controlledReadableByteStream._state;
          if (state === "errored") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function ReadableByteStreamControllerRespond(controller, bytesWritten) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            if (bytesWritten !== 0) {
              throw new TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
            }
          } else {
            if (bytesWritten === 0) {
              throw new TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
            }
            if (firstDescriptor.bytesFilled + bytesWritten > firstDescriptor.byteLength) {
              throw new RangeError("bytesWritten out of range");
            }
          }
          firstDescriptor.buffer = TransferArrayBuffer(firstDescriptor.buffer);
          ReadableByteStreamControllerRespondInternal(controller, bytesWritten);
        }
        function ReadableByteStreamControllerRespondWithNewView(controller, view) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            if (view.byteLength !== 0) {
              throw new TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
            }
          } else {
            if (view.byteLength === 0) {
              throw new TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
            }
          }
          if (firstDescriptor.byteOffset + firstDescriptor.bytesFilled !== view.byteOffset) {
            throw new RangeError("The region specified by view does not match byobRequest");
          }
          if (firstDescriptor.bufferByteLength !== view.buffer.byteLength) {
            throw new RangeError("The buffer of view has different capacity than byobRequest");
          }
          if (firstDescriptor.bytesFilled + view.byteLength > firstDescriptor.byteLength) {
            throw new RangeError("The region specified by view is larger than byobRequest");
          }
          firstDescriptor.buffer = TransferArrayBuffer(view.buffer);
          ReadableByteStreamControllerRespondInternal(controller, view.byteLength);
        }
        function SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize) {
          controller._controlledReadableByteStream = stream;
          controller._pullAgain = false;
          controller._pulling = false;
          controller._byobRequest = null;
          controller._queue = controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._closeRequested = false;
          controller._started = false;
          controller._strategyHWM = highWaterMark;
          controller._pullAlgorithm = pullAlgorithm;
          controller._cancelAlgorithm = cancelAlgorithm;
          controller._autoAllocateChunkSize = autoAllocateChunkSize;
          controller._pendingPullIntos = new SimpleQueue();
          stream._readableStreamController = controller;
          const startResult = startAlgorithm();
          uponPromise(promiseResolvedWith(startResult), () => {
            controller._started = true;
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }, (r) => {
            ReadableByteStreamControllerError(controller, r);
          });
        }
        function SetUpReadableByteStreamControllerFromUnderlyingSource(stream, underlyingByteSource, highWaterMark) {
          const controller = Object.create(ReadableByteStreamController.prototype);
          let startAlgorithm = () => void 0;
          let pullAlgorithm = () => promiseResolvedWith(void 0);
          let cancelAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingByteSource.start !== void 0) {
            startAlgorithm = () => underlyingByteSource.start(controller);
          }
          if (underlyingByteSource.pull !== void 0) {
            pullAlgorithm = () => underlyingByteSource.pull(controller);
          }
          if (underlyingByteSource.cancel !== void 0) {
            cancelAlgorithm = (reason) => underlyingByteSource.cancel(reason);
          }
          const autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
          if (autoAllocateChunkSize === 0) {
            throw new TypeError("autoAllocateChunkSize must be greater than 0");
          }
          SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize);
        }
        function SetUpReadableStreamBYOBRequest(request, controller, view) {
          request._associatedReadableByteStreamController = controller;
          request._view = view;
        }
        function byobRequestBrandCheckException(name) {
          return new TypeError(`ReadableStreamBYOBRequest.prototype.${name} can only be used on a ReadableStreamBYOBRequest`);
        }
        function byteStreamControllerBrandCheckException(name) {
          return new TypeError(`ReadableByteStreamController.prototype.${name} can only be used on a ReadableByteStreamController`);
        }
        function AcquireReadableStreamBYOBReader(stream) {
          return new ReadableStreamBYOBReader(stream);
        }
        function ReadableStreamAddReadIntoRequest(stream, readIntoRequest) {
          stream._reader._readIntoRequests.push(readIntoRequest);
        }
        function ReadableStreamFulfillReadIntoRequest(stream, chunk, done) {
          const reader = stream._reader;
          const readIntoRequest = reader._readIntoRequests.shift();
          if (done) {
            readIntoRequest._closeSteps(chunk);
          } else {
            readIntoRequest._chunkSteps(chunk);
          }
        }
        function ReadableStreamGetNumReadIntoRequests(stream) {
          return stream._reader._readIntoRequests.length;
        }
        function ReadableStreamHasBYOBReader(stream) {
          const reader = stream._reader;
          if (reader === void 0) {
            return false;
          }
          if (!IsReadableStreamBYOBReader(reader)) {
            return false;
          }
          return true;
        }
        class ReadableStreamBYOBReader {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "ReadableStreamBYOBReader");
            assertReadableStream(stream, "First parameter");
            if (IsReadableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive reading by another reader");
            }
            if (!IsReadableByteStreamController(stream._readableStreamController)) {
              throw new TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
            }
            ReadableStreamReaderGenericInitialize(this, stream);
            this._readIntoRequests = new SimpleQueue();
          }
          get closed() {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          cancel(reason = void 0) {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("cancel"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("cancel"));
            }
            return ReadableStreamReaderGenericCancel(this, reason);
          }
          read(view) {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("read"));
            }
            if (!ArrayBuffer.isView(view)) {
              return promiseRejectedWith(new TypeError("view must be an array buffer view"));
            }
            if (view.byteLength === 0) {
              return promiseRejectedWith(new TypeError("view must have non-zero byteLength"));
            }
            if (view.buffer.byteLength === 0) {
              return promiseRejectedWith(new TypeError(`view's buffer must have non-zero byteLength`));
            }
            if (IsDetachedBuffer(view.buffer))
              ;
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("read from"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve3, reject) => {
              resolvePromise = resolve3;
              rejectPromise = reject;
            });
            const readIntoRequest = {
              _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
              _closeSteps: (chunk) => resolvePromise({ value: chunk, done: true }),
              _errorSteps: (e) => rejectPromise(e)
            };
            ReadableStreamBYOBReaderRead(this, view, readIntoRequest);
            return promise;
          }
          releaseLock() {
            if (!IsReadableStreamBYOBReader(this)) {
              throw byobReaderBrandCheckException("releaseLock");
            }
            if (this._ownerReadableStream === void 0) {
              return;
            }
            if (this._readIntoRequests.length > 0) {
              throw new TypeError("Tried to release a reader lock when that reader has pending read() calls un-settled");
            }
            ReadableStreamReaderGenericRelease(this);
          }
        }
        Object.defineProperties(ReadableStreamBYOBReader.prototype, {
          cancel: { enumerable: true },
          read: { enumerable: true },
          releaseLock: { enumerable: true },
          closed: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamBYOBReader.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamBYOBReader",
            configurable: true
          });
        }
        function IsReadableStreamBYOBReader(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readIntoRequests")) {
            return false;
          }
          return x instanceof ReadableStreamBYOBReader;
        }
        function ReadableStreamBYOBReaderRead(reader, view, readIntoRequest) {
          const stream = reader._ownerReadableStream;
          stream._disturbed = true;
          if (stream._state === "errored") {
            readIntoRequest._errorSteps(stream._storedError);
          } else {
            ReadableByteStreamControllerPullInto(stream._readableStreamController, view, readIntoRequest);
          }
        }
        function byobReaderBrandCheckException(name) {
          return new TypeError(`ReadableStreamBYOBReader.prototype.${name} can only be used on a ReadableStreamBYOBReader`);
        }
        function ExtractHighWaterMark(strategy, defaultHWM) {
          const { highWaterMark } = strategy;
          if (highWaterMark === void 0) {
            return defaultHWM;
          }
          if (NumberIsNaN(highWaterMark) || highWaterMark < 0) {
            throw new RangeError("Invalid highWaterMark");
          }
          return highWaterMark;
        }
        function ExtractSizeAlgorithm(strategy) {
          const { size } = strategy;
          if (!size) {
            return () => 1;
          }
          return size;
        }
        function convertQueuingStrategy(init2, context) {
          assertDictionary(init2, context);
          const highWaterMark = init2 === null || init2 === void 0 ? void 0 : init2.highWaterMark;
          const size = init2 === null || init2 === void 0 ? void 0 : init2.size;
          return {
            highWaterMark: highWaterMark === void 0 ? void 0 : convertUnrestrictedDouble(highWaterMark),
            size: size === void 0 ? void 0 : convertQueuingStrategySize(size, `${context} has member 'size' that`)
          };
        }
        function convertQueuingStrategySize(fn, context) {
          assertFunction(fn, context);
          return (chunk) => convertUnrestrictedDouble(fn(chunk));
        }
        function convertUnderlyingSink(original, context) {
          assertDictionary(original, context);
          const abort = original === null || original === void 0 ? void 0 : original.abort;
          const close = original === null || original === void 0 ? void 0 : original.close;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const type = original === null || original === void 0 ? void 0 : original.type;
          const write = original === null || original === void 0 ? void 0 : original.write;
          return {
            abort: abort === void 0 ? void 0 : convertUnderlyingSinkAbortCallback(abort, original, `${context} has member 'abort' that`),
            close: close === void 0 ? void 0 : convertUnderlyingSinkCloseCallback(close, original, `${context} has member 'close' that`),
            start: start === void 0 ? void 0 : convertUnderlyingSinkStartCallback(start, original, `${context} has member 'start' that`),
            write: write === void 0 ? void 0 : convertUnderlyingSinkWriteCallback(write, original, `${context} has member 'write' that`),
            type
          };
        }
        function convertUnderlyingSinkAbortCallback(fn, original, context) {
          assertFunction(fn, context);
          return (reason) => promiseCall(fn, original, [reason]);
        }
        function convertUnderlyingSinkCloseCallback(fn, original, context) {
          assertFunction(fn, context);
          return () => promiseCall(fn, original, []);
        }
        function convertUnderlyingSinkStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertUnderlyingSinkWriteCallback(fn, original, context) {
          assertFunction(fn, context);
          return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
        }
        function assertWritableStream(x, context) {
          if (!IsWritableStream(x)) {
            throw new TypeError(`${context} is not a WritableStream.`);
          }
        }
        function isAbortSignal2(value) {
          if (typeof value !== "object" || value === null) {
            return false;
          }
          try {
            return typeof value.aborted === "boolean";
          } catch (_a2) {
            return false;
          }
        }
        const supportsAbortController = typeof AbortController === "function";
        function createAbortController() {
          if (supportsAbortController) {
            return new AbortController();
          }
          return void 0;
        }
        class WritableStream {
          constructor(rawUnderlyingSink = {}, rawStrategy = {}) {
            if (rawUnderlyingSink === void 0) {
              rawUnderlyingSink = null;
            } else {
              assertObject(rawUnderlyingSink, "First parameter");
            }
            const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
            const underlyingSink = convertUnderlyingSink(rawUnderlyingSink, "First parameter");
            InitializeWritableStream(this);
            const type = underlyingSink.type;
            if (type !== void 0) {
              throw new RangeError("Invalid type is specified");
            }
            const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
            const highWaterMark = ExtractHighWaterMark(strategy, 1);
            SetUpWritableStreamDefaultControllerFromUnderlyingSink(this, underlyingSink, highWaterMark, sizeAlgorithm);
          }
          get locked() {
            if (!IsWritableStream(this)) {
              throw streamBrandCheckException$2("locked");
            }
            return IsWritableStreamLocked(this);
          }
          abort(reason = void 0) {
            if (!IsWritableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$2("abort"));
            }
            if (IsWritableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot abort a stream that already has a writer"));
            }
            return WritableStreamAbort(this, reason);
          }
          close() {
            if (!IsWritableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$2("close"));
            }
            if (IsWritableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot close a stream that already has a writer"));
            }
            if (WritableStreamCloseQueuedOrInFlight(this)) {
              return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
            }
            return WritableStreamClose(this);
          }
          getWriter() {
            if (!IsWritableStream(this)) {
              throw streamBrandCheckException$2("getWriter");
            }
            return AcquireWritableStreamDefaultWriter(this);
          }
        }
        Object.defineProperties(WritableStream.prototype, {
          abort: { enumerable: true },
          close: { enumerable: true },
          getWriter: { enumerable: true },
          locked: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStream.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStream",
            configurable: true
          });
        }
        function AcquireWritableStreamDefaultWriter(stream) {
          return new WritableStreamDefaultWriter(stream);
        }
        function CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
          const stream = Object.create(WritableStream.prototype);
          InitializeWritableStream(stream);
          const controller = Object.create(WritableStreamDefaultController.prototype);
          SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
          return stream;
        }
        function InitializeWritableStream(stream) {
          stream._state = "writable";
          stream._storedError = void 0;
          stream._writer = void 0;
          stream._writableStreamController = void 0;
          stream._writeRequests = new SimpleQueue();
          stream._inFlightWriteRequest = void 0;
          stream._closeRequest = void 0;
          stream._inFlightCloseRequest = void 0;
          stream._pendingAbortRequest = void 0;
          stream._backpressure = false;
        }
        function IsWritableStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_writableStreamController")) {
            return false;
          }
          return x instanceof WritableStream;
        }
        function IsWritableStreamLocked(stream) {
          if (stream._writer === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamAbort(stream, reason) {
          var _a2;
          if (stream._state === "closed" || stream._state === "errored") {
            return promiseResolvedWith(void 0);
          }
          stream._writableStreamController._abortReason = reason;
          (_a2 = stream._writableStreamController._abortController) === null || _a2 === void 0 ? void 0 : _a2.abort();
          const state = stream._state;
          if (state === "closed" || state === "errored") {
            return promiseResolvedWith(void 0);
          }
          if (stream._pendingAbortRequest !== void 0) {
            return stream._pendingAbortRequest._promise;
          }
          let wasAlreadyErroring = false;
          if (state === "erroring") {
            wasAlreadyErroring = true;
            reason = void 0;
          }
          const promise = newPromise((resolve3, reject) => {
            stream._pendingAbortRequest = {
              _promise: void 0,
              _resolve: resolve3,
              _reject: reject,
              _reason: reason,
              _wasAlreadyErroring: wasAlreadyErroring
            };
          });
          stream._pendingAbortRequest._promise = promise;
          if (!wasAlreadyErroring) {
            WritableStreamStartErroring(stream, reason);
          }
          return promise;
        }
        function WritableStreamClose(stream) {
          const state = stream._state;
          if (state === "closed" || state === "errored") {
            return promiseRejectedWith(new TypeError(`The stream (in ${state} state) is not in the writable state and cannot be closed`));
          }
          const promise = newPromise((resolve3, reject) => {
            const closeRequest = {
              _resolve: resolve3,
              _reject: reject
            };
            stream._closeRequest = closeRequest;
          });
          const writer = stream._writer;
          if (writer !== void 0 && stream._backpressure && state === "writable") {
            defaultWriterReadyPromiseResolve(writer);
          }
          WritableStreamDefaultControllerClose(stream._writableStreamController);
          return promise;
        }
        function WritableStreamAddWriteRequest(stream) {
          const promise = newPromise((resolve3, reject) => {
            const writeRequest = {
              _resolve: resolve3,
              _reject: reject
            };
            stream._writeRequests.push(writeRequest);
          });
          return promise;
        }
        function WritableStreamDealWithRejection(stream, error2) {
          const state = stream._state;
          if (state === "writable") {
            WritableStreamStartErroring(stream, error2);
            return;
          }
          WritableStreamFinishErroring(stream);
        }
        function WritableStreamStartErroring(stream, reason) {
          const controller = stream._writableStreamController;
          stream._state = "erroring";
          stream._storedError = reason;
          const writer = stream._writer;
          if (writer !== void 0) {
            WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, reason);
          }
          if (!WritableStreamHasOperationMarkedInFlight(stream) && controller._started) {
            WritableStreamFinishErroring(stream);
          }
        }
        function WritableStreamFinishErroring(stream) {
          stream._state = "errored";
          stream._writableStreamController[ErrorSteps]();
          const storedError = stream._storedError;
          stream._writeRequests.forEach((writeRequest) => {
            writeRequest._reject(storedError);
          });
          stream._writeRequests = new SimpleQueue();
          if (stream._pendingAbortRequest === void 0) {
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
            return;
          }
          const abortRequest = stream._pendingAbortRequest;
          stream._pendingAbortRequest = void 0;
          if (abortRequest._wasAlreadyErroring) {
            abortRequest._reject(storedError);
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
            return;
          }
          const promise = stream._writableStreamController[AbortSteps](abortRequest._reason);
          uponPromise(promise, () => {
            abortRequest._resolve();
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          }, (reason) => {
            abortRequest._reject(reason);
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          });
        }
        function WritableStreamFinishInFlightWrite(stream) {
          stream._inFlightWriteRequest._resolve(void 0);
          stream._inFlightWriteRequest = void 0;
        }
        function WritableStreamFinishInFlightWriteWithError(stream, error2) {
          stream._inFlightWriteRequest._reject(error2);
          stream._inFlightWriteRequest = void 0;
          WritableStreamDealWithRejection(stream, error2);
        }
        function WritableStreamFinishInFlightClose(stream) {
          stream._inFlightCloseRequest._resolve(void 0);
          stream._inFlightCloseRequest = void 0;
          const state = stream._state;
          if (state === "erroring") {
            stream._storedError = void 0;
            if (stream._pendingAbortRequest !== void 0) {
              stream._pendingAbortRequest._resolve();
              stream._pendingAbortRequest = void 0;
            }
          }
          stream._state = "closed";
          const writer = stream._writer;
          if (writer !== void 0) {
            defaultWriterClosedPromiseResolve(writer);
          }
        }
        function WritableStreamFinishInFlightCloseWithError(stream, error2) {
          stream._inFlightCloseRequest._reject(error2);
          stream._inFlightCloseRequest = void 0;
          if (stream._pendingAbortRequest !== void 0) {
            stream._pendingAbortRequest._reject(error2);
            stream._pendingAbortRequest = void 0;
          }
          WritableStreamDealWithRejection(stream, error2);
        }
        function WritableStreamCloseQueuedOrInFlight(stream) {
          if (stream._closeRequest === void 0 && stream._inFlightCloseRequest === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamHasOperationMarkedInFlight(stream) {
          if (stream._inFlightWriteRequest === void 0 && stream._inFlightCloseRequest === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamMarkCloseRequestInFlight(stream) {
          stream._inFlightCloseRequest = stream._closeRequest;
          stream._closeRequest = void 0;
        }
        function WritableStreamMarkFirstWriteRequestInFlight(stream) {
          stream._inFlightWriteRequest = stream._writeRequests.shift();
        }
        function WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream) {
          if (stream._closeRequest !== void 0) {
            stream._closeRequest._reject(stream._storedError);
            stream._closeRequest = void 0;
          }
          const writer = stream._writer;
          if (writer !== void 0) {
            defaultWriterClosedPromiseReject(writer, stream._storedError);
          }
        }
        function WritableStreamUpdateBackpressure(stream, backpressure) {
          const writer = stream._writer;
          if (writer !== void 0 && backpressure !== stream._backpressure) {
            if (backpressure) {
              defaultWriterReadyPromiseReset(writer);
            } else {
              defaultWriterReadyPromiseResolve(writer);
            }
          }
          stream._backpressure = backpressure;
        }
        class WritableStreamDefaultWriter {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "WritableStreamDefaultWriter");
            assertWritableStream(stream, "First parameter");
            if (IsWritableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive writing by another writer");
            }
            this._ownerWritableStream = stream;
            stream._writer = this;
            const state = stream._state;
            if (state === "writable") {
              if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._backpressure) {
                defaultWriterReadyPromiseInitialize(this);
              } else {
                defaultWriterReadyPromiseInitializeAsResolved(this);
              }
              defaultWriterClosedPromiseInitialize(this);
            } else if (state === "erroring") {
              defaultWriterReadyPromiseInitializeAsRejected(this, stream._storedError);
              defaultWriterClosedPromiseInitialize(this);
            } else if (state === "closed") {
              defaultWriterReadyPromiseInitializeAsResolved(this);
              defaultWriterClosedPromiseInitializeAsResolved(this);
            } else {
              const storedError = stream._storedError;
              defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
              defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
            }
          }
          get closed() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          get desiredSize() {
            if (!IsWritableStreamDefaultWriter(this)) {
              throw defaultWriterBrandCheckException("desiredSize");
            }
            if (this._ownerWritableStream === void 0) {
              throw defaultWriterLockException("desiredSize");
            }
            return WritableStreamDefaultWriterGetDesiredSize(this);
          }
          get ready() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("ready"));
            }
            return this._readyPromise;
          }
          abort(reason = void 0) {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("abort"));
            }
            if (this._ownerWritableStream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("abort"));
            }
            return WritableStreamDefaultWriterAbort(this, reason);
          }
          close() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("close"));
            }
            const stream = this._ownerWritableStream;
            if (stream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("close"));
            }
            if (WritableStreamCloseQueuedOrInFlight(stream)) {
              return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
            }
            return WritableStreamDefaultWriterClose(this);
          }
          releaseLock() {
            if (!IsWritableStreamDefaultWriter(this)) {
              throw defaultWriterBrandCheckException("releaseLock");
            }
            const stream = this._ownerWritableStream;
            if (stream === void 0) {
              return;
            }
            WritableStreamDefaultWriterRelease(this);
          }
          write(chunk = void 0) {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("write"));
            }
            if (this._ownerWritableStream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("write to"));
            }
            return WritableStreamDefaultWriterWrite(this, chunk);
          }
        }
        Object.defineProperties(WritableStreamDefaultWriter.prototype, {
          abort: { enumerable: true },
          close: { enumerable: true },
          releaseLock: { enumerable: true },
          write: { enumerable: true },
          closed: { enumerable: true },
          desiredSize: { enumerable: true },
          ready: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStreamDefaultWriter.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStreamDefaultWriter",
            configurable: true
          });
        }
        function IsWritableStreamDefaultWriter(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_ownerWritableStream")) {
            return false;
          }
          return x instanceof WritableStreamDefaultWriter;
        }
        function WritableStreamDefaultWriterAbort(writer, reason) {
          const stream = writer._ownerWritableStream;
          return WritableStreamAbort(stream, reason);
        }
        function WritableStreamDefaultWriterClose(writer) {
          const stream = writer._ownerWritableStream;
          return WritableStreamClose(stream);
        }
        function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
          const stream = writer._ownerWritableStream;
          const state = stream._state;
          if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
            return promiseResolvedWith(void 0);
          }
          if (state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          return WritableStreamDefaultWriterClose(writer);
        }
        function WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, error2) {
          if (writer._closedPromiseState === "pending") {
            defaultWriterClosedPromiseReject(writer, error2);
          } else {
            defaultWriterClosedPromiseResetToRejected(writer, error2);
          }
        }
        function WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, error2) {
          if (writer._readyPromiseState === "pending") {
            defaultWriterReadyPromiseReject(writer, error2);
          } else {
            defaultWriterReadyPromiseResetToRejected(writer, error2);
          }
        }
        function WritableStreamDefaultWriterGetDesiredSize(writer) {
          const stream = writer._ownerWritableStream;
          const state = stream._state;
          if (state === "errored" || state === "erroring") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
        }
        function WritableStreamDefaultWriterRelease(writer) {
          const stream = writer._ownerWritableStream;
          const releasedError = new TypeError(`Writer was released and can no longer be used to monitor the stream's closedness`);
          WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
          WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
          stream._writer = void 0;
          writer._ownerWritableStream = void 0;
        }
        function WritableStreamDefaultWriterWrite(writer, chunk) {
          const stream = writer._ownerWritableStream;
          const controller = stream._writableStreamController;
          const chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
          if (stream !== writer._ownerWritableStream) {
            return promiseRejectedWith(defaultWriterLockException("write to"));
          }
          const state = stream._state;
          if (state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
            return promiseRejectedWith(new TypeError("The stream is closing or closed and cannot be written to"));
          }
          if (state === "erroring") {
            return promiseRejectedWith(stream._storedError);
          }
          const promise = WritableStreamAddWriteRequest(stream);
          WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
          return promise;
        }
        const closeSentinel = {};
        class WritableStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get abortReason() {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("abortReason");
            }
            return this._abortReason;
          }
          get signal() {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("signal");
            }
            if (this._abortController === void 0) {
              throw new TypeError("WritableStreamDefaultController.prototype.signal is not supported");
            }
            return this._abortController.signal;
          }
          error(e = void 0) {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("error");
            }
            const state = this._controlledWritableStream._state;
            if (state !== "writable") {
              return;
            }
            WritableStreamDefaultControllerError(this, e);
          }
          [AbortSteps](reason) {
            const result = this._abortAlgorithm(reason);
            WritableStreamDefaultControllerClearAlgorithms(this);
            return result;
          }
          [ErrorSteps]() {
            ResetQueue(this);
          }
        }
        Object.defineProperties(WritableStreamDefaultController.prototype, {
          error: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStreamDefaultController",
            configurable: true
          });
        }
        function IsWritableStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledWritableStream")) {
            return false;
          }
          return x instanceof WritableStreamDefaultController;
        }
        function SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm) {
          controller._controlledWritableStream = stream;
          stream._writableStreamController = controller;
          controller._queue = void 0;
          controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._abortReason = void 0;
          controller._abortController = createAbortController();
          controller._started = false;
          controller._strategySizeAlgorithm = sizeAlgorithm;
          controller._strategyHWM = highWaterMark;
          controller._writeAlgorithm = writeAlgorithm;
          controller._closeAlgorithm = closeAlgorithm;
          controller._abortAlgorithm = abortAlgorithm;
          const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
          WritableStreamUpdateBackpressure(stream, backpressure);
          const startResult = startAlgorithm();
          const startPromise = promiseResolvedWith(startResult);
          uponPromise(startPromise, () => {
            controller._started = true;
            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          }, (r) => {
            controller._started = true;
            WritableStreamDealWithRejection(stream, r);
          });
        }
        function SetUpWritableStreamDefaultControllerFromUnderlyingSink(stream, underlyingSink, highWaterMark, sizeAlgorithm) {
          const controller = Object.create(WritableStreamDefaultController.prototype);
          let startAlgorithm = () => void 0;
          let writeAlgorithm = () => promiseResolvedWith(void 0);
          let closeAlgorithm = () => promiseResolvedWith(void 0);
          let abortAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingSink.start !== void 0) {
            startAlgorithm = () => underlyingSink.start(controller);
          }
          if (underlyingSink.write !== void 0) {
            writeAlgorithm = (chunk) => underlyingSink.write(chunk, controller);
          }
          if (underlyingSink.close !== void 0) {
            closeAlgorithm = () => underlyingSink.close();
          }
          if (underlyingSink.abort !== void 0) {
            abortAlgorithm = (reason) => underlyingSink.abort(reason);
          }
          SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
        }
        function WritableStreamDefaultControllerClearAlgorithms(controller) {
          controller._writeAlgorithm = void 0;
          controller._closeAlgorithm = void 0;
          controller._abortAlgorithm = void 0;
          controller._strategySizeAlgorithm = void 0;
        }
        function WritableStreamDefaultControllerClose(controller) {
          EnqueueValueWithSize(controller, closeSentinel, 0);
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        }
        function WritableStreamDefaultControllerGetChunkSize(controller, chunk) {
          try {
            return controller._strategySizeAlgorithm(chunk);
          } catch (chunkSizeE) {
            WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
            return 1;
          }
        }
        function WritableStreamDefaultControllerGetDesiredSize(controller) {
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function WritableStreamDefaultControllerWrite(controller, chunk, chunkSize) {
          try {
            EnqueueValueWithSize(controller, chunk, chunkSize);
          } catch (enqueueE) {
            WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
            return;
          }
          const stream = controller._controlledWritableStream;
          if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === "writable") {
            const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
            WritableStreamUpdateBackpressure(stream, backpressure);
          }
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        }
        function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
          const stream = controller._controlledWritableStream;
          if (!controller._started) {
            return;
          }
          if (stream._inFlightWriteRequest !== void 0) {
            return;
          }
          const state = stream._state;
          if (state === "erroring") {
            WritableStreamFinishErroring(stream);
            return;
          }
          if (controller._queue.length === 0) {
            return;
          }
          const value = PeekQueueValue(controller);
          if (value === closeSentinel) {
            WritableStreamDefaultControllerProcessClose(controller);
          } else {
            WritableStreamDefaultControllerProcessWrite(controller, value);
          }
        }
        function WritableStreamDefaultControllerErrorIfNeeded(controller, error2) {
          if (controller._controlledWritableStream._state === "writable") {
            WritableStreamDefaultControllerError(controller, error2);
          }
        }
        function WritableStreamDefaultControllerProcessClose(controller) {
          const stream = controller._controlledWritableStream;
          WritableStreamMarkCloseRequestInFlight(stream);
          DequeueValue(controller);
          const sinkClosePromise = controller._closeAlgorithm();
          WritableStreamDefaultControllerClearAlgorithms(controller);
          uponPromise(sinkClosePromise, () => {
            WritableStreamFinishInFlightClose(stream);
          }, (reason) => {
            WritableStreamFinishInFlightCloseWithError(stream, reason);
          });
        }
        function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
          const stream = controller._controlledWritableStream;
          WritableStreamMarkFirstWriteRequestInFlight(stream);
          const sinkWritePromise = controller._writeAlgorithm(chunk);
          uponPromise(sinkWritePromise, () => {
            WritableStreamFinishInFlightWrite(stream);
            const state = stream._state;
            DequeueValue(controller);
            if (!WritableStreamCloseQueuedOrInFlight(stream) && state === "writable") {
              const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
              WritableStreamUpdateBackpressure(stream, backpressure);
            }
            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          }, (reason) => {
            if (stream._state === "writable") {
              WritableStreamDefaultControllerClearAlgorithms(controller);
            }
            WritableStreamFinishInFlightWriteWithError(stream, reason);
          });
        }
        function WritableStreamDefaultControllerGetBackpressure(controller) {
          const desiredSize = WritableStreamDefaultControllerGetDesiredSize(controller);
          return desiredSize <= 0;
        }
        function WritableStreamDefaultControllerError(controller, error2) {
          const stream = controller._controlledWritableStream;
          WritableStreamDefaultControllerClearAlgorithms(controller);
          WritableStreamStartErroring(stream, error2);
        }
        function streamBrandCheckException$2(name) {
          return new TypeError(`WritableStream.prototype.${name} can only be used on a WritableStream`);
        }
        function defaultControllerBrandCheckException$2(name) {
          return new TypeError(`WritableStreamDefaultController.prototype.${name} can only be used on a WritableStreamDefaultController`);
        }
        function defaultWriterBrandCheckException(name) {
          return new TypeError(`WritableStreamDefaultWriter.prototype.${name} can only be used on a WritableStreamDefaultWriter`);
        }
        function defaultWriterLockException(name) {
          return new TypeError("Cannot " + name + " a stream using a released writer");
        }
        function defaultWriterClosedPromiseInitialize(writer) {
          writer._closedPromise = newPromise((resolve3, reject) => {
            writer._closedPromise_resolve = resolve3;
            writer._closedPromise_reject = reject;
            writer._closedPromiseState = "pending";
          });
        }
        function defaultWriterClosedPromiseInitializeAsRejected(writer, reason) {
          defaultWriterClosedPromiseInitialize(writer);
          defaultWriterClosedPromiseReject(writer, reason);
        }
        function defaultWriterClosedPromiseInitializeAsResolved(writer) {
          defaultWriterClosedPromiseInitialize(writer);
          defaultWriterClosedPromiseResolve(writer);
        }
        function defaultWriterClosedPromiseReject(writer, reason) {
          if (writer._closedPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(writer._closedPromise);
          writer._closedPromise_reject(reason);
          writer._closedPromise_resolve = void 0;
          writer._closedPromise_reject = void 0;
          writer._closedPromiseState = "rejected";
        }
        function defaultWriterClosedPromiseResetToRejected(writer, reason) {
          defaultWriterClosedPromiseInitializeAsRejected(writer, reason);
        }
        function defaultWriterClosedPromiseResolve(writer) {
          if (writer._closedPromise_resolve === void 0) {
            return;
          }
          writer._closedPromise_resolve(void 0);
          writer._closedPromise_resolve = void 0;
          writer._closedPromise_reject = void 0;
          writer._closedPromiseState = "resolved";
        }
        function defaultWriterReadyPromiseInitialize(writer) {
          writer._readyPromise = newPromise((resolve3, reject) => {
            writer._readyPromise_resolve = resolve3;
            writer._readyPromise_reject = reject;
          });
          writer._readyPromiseState = "pending";
        }
        function defaultWriterReadyPromiseInitializeAsRejected(writer, reason) {
          defaultWriterReadyPromiseInitialize(writer);
          defaultWriterReadyPromiseReject(writer, reason);
        }
        function defaultWriterReadyPromiseInitializeAsResolved(writer) {
          defaultWriterReadyPromiseInitialize(writer);
          defaultWriterReadyPromiseResolve(writer);
        }
        function defaultWriterReadyPromiseReject(writer, reason) {
          if (writer._readyPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(writer._readyPromise);
          writer._readyPromise_reject(reason);
          writer._readyPromise_resolve = void 0;
          writer._readyPromise_reject = void 0;
          writer._readyPromiseState = "rejected";
        }
        function defaultWriterReadyPromiseReset(writer) {
          defaultWriterReadyPromiseInitialize(writer);
        }
        function defaultWriterReadyPromiseResetToRejected(writer, reason) {
          defaultWriterReadyPromiseInitializeAsRejected(writer, reason);
        }
        function defaultWriterReadyPromiseResolve(writer) {
          if (writer._readyPromise_resolve === void 0) {
            return;
          }
          writer._readyPromise_resolve(void 0);
          writer._readyPromise_resolve = void 0;
          writer._readyPromise_reject = void 0;
          writer._readyPromiseState = "fulfilled";
        }
        const NativeDOMException = typeof DOMException !== "undefined" ? DOMException : void 0;
        function isDOMExceptionConstructor(ctor) {
          if (!(typeof ctor === "function" || typeof ctor === "object")) {
            return false;
          }
          try {
            new ctor();
            return true;
          } catch (_a2) {
            return false;
          }
        }
        function createDOMExceptionPolyfill() {
          const ctor = function DOMException2(message, name) {
            this.message = message || "";
            this.name = name || "Error";
            if (Error.captureStackTrace) {
              Error.captureStackTrace(this, this.constructor);
            }
          };
          ctor.prototype = Object.create(Error.prototype);
          Object.defineProperty(ctor.prototype, "constructor", { value: ctor, writable: true, configurable: true });
          return ctor;
        }
        const DOMException$1 = isDOMExceptionConstructor(NativeDOMException) ? NativeDOMException : createDOMExceptionPolyfill();
        function ReadableStreamPipeTo(source, dest, preventClose, preventAbort, preventCancel, signal) {
          const reader = AcquireReadableStreamDefaultReader(source);
          const writer = AcquireWritableStreamDefaultWriter(dest);
          source._disturbed = true;
          let shuttingDown = false;
          let currentWrite = promiseResolvedWith(void 0);
          return newPromise((resolve3, reject) => {
            let abortAlgorithm;
            if (signal !== void 0) {
              abortAlgorithm = () => {
                const error2 = new DOMException$1("Aborted", "AbortError");
                const actions = [];
                if (!preventAbort) {
                  actions.push(() => {
                    if (dest._state === "writable") {
                      return WritableStreamAbort(dest, error2);
                    }
                    return promiseResolvedWith(void 0);
                  });
                }
                if (!preventCancel) {
                  actions.push(() => {
                    if (source._state === "readable") {
                      return ReadableStreamCancel(source, error2);
                    }
                    return promiseResolvedWith(void 0);
                  });
                }
                shutdownWithAction(() => Promise.all(actions.map((action) => action())), true, error2);
              };
              if (signal.aborted) {
                abortAlgorithm();
                return;
              }
              signal.addEventListener("abort", abortAlgorithm);
            }
            function pipeLoop() {
              return newPromise((resolveLoop, rejectLoop) => {
                function next(done) {
                  if (done) {
                    resolveLoop();
                  } else {
                    PerformPromiseThen(pipeStep(), next, rejectLoop);
                  }
                }
                next(false);
              });
            }
            function pipeStep() {
              if (shuttingDown) {
                return promiseResolvedWith(true);
              }
              return PerformPromiseThen(writer._readyPromise, () => {
                return newPromise((resolveRead, rejectRead) => {
                  ReadableStreamDefaultReaderRead(reader, {
                    _chunkSteps: (chunk) => {
                      currentWrite = PerformPromiseThen(WritableStreamDefaultWriterWrite(writer, chunk), void 0, noop4);
                      resolveRead(false);
                    },
                    _closeSteps: () => resolveRead(true),
                    _errorSteps: rejectRead
                  });
                });
              });
            }
            isOrBecomesErrored(source, reader._closedPromise, (storedError) => {
              if (!preventAbort) {
                shutdownWithAction(() => WritableStreamAbort(dest, storedError), true, storedError);
              } else {
                shutdown(true, storedError);
              }
            });
            isOrBecomesErrored(dest, writer._closedPromise, (storedError) => {
              if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, storedError), true, storedError);
              } else {
                shutdown(true, storedError);
              }
            });
            isOrBecomesClosed(source, reader._closedPromise, () => {
              if (!preventClose) {
                shutdownWithAction(() => WritableStreamDefaultWriterCloseWithErrorPropagation(writer));
              } else {
                shutdown();
              }
            });
            if (WritableStreamCloseQueuedOrInFlight(dest) || dest._state === "closed") {
              const destClosed = new TypeError("the destination writable stream closed before all data could be piped to it");
              if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, destClosed), true, destClosed);
              } else {
                shutdown(true, destClosed);
              }
            }
            setPromiseIsHandledToTrue(pipeLoop());
            function waitForWritesToFinish() {
              const oldCurrentWrite = currentWrite;
              return PerformPromiseThen(currentWrite, () => oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : void 0);
            }
            function isOrBecomesErrored(stream, promise, action) {
              if (stream._state === "errored") {
                action(stream._storedError);
              } else {
                uponRejection(promise, action);
              }
            }
            function isOrBecomesClosed(stream, promise, action) {
              if (stream._state === "closed") {
                action();
              } else {
                uponFulfillment(promise, action);
              }
            }
            function shutdownWithAction(action, originalIsError, originalError) {
              if (shuttingDown) {
                return;
              }
              shuttingDown = true;
              if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), doTheRest);
              } else {
                doTheRest();
              }
              function doTheRest() {
                uponPromise(action(), () => finalize(originalIsError, originalError), (newError) => finalize(true, newError));
              }
            }
            function shutdown(isError, error2) {
              if (shuttingDown) {
                return;
              }
              shuttingDown = true;
              if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), () => finalize(isError, error2));
              } else {
                finalize(isError, error2);
              }
            }
            function finalize(isError, error2) {
              WritableStreamDefaultWriterRelease(writer);
              ReadableStreamReaderGenericRelease(reader);
              if (signal !== void 0) {
                signal.removeEventListener("abort", abortAlgorithm);
              }
              if (isError) {
                reject(error2);
              } else {
                resolve3(void 0);
              }
            }
          });
        }
        class ReadableStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get desiredSize() {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("desiredSize");
            }
            return ReadableStreamDefaultControllerGetDesiredSize(this);
          }
          close() {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("close");
            }
            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
              throw new TypeError("The stream is not in a state that permits close");
            }
            ReadableStreamDefaultControllerClose(this);
          }
          enqueue(chunk = void 0) {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("enqueue");
            }
            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
              throw new TypeError("The stream is not in a state that permits enqueue");
            }
            return ReadableStreamDefaultControllerEnqueue(this, chunk);
          }
          error(e = void 0) {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("error");
            }
            ReadableStreamDefaultControllerError(this, e);
          }
          [CancelSteps](reason) {
            ResetQueue(this);
            const result = this._cancelAlgorithm(reason);
            ReadableStreamDefaultControllerClearAlgorithms(this);
            return result;
          }
          [PullSteps](readRequest) {
            const stream = this._controlledReadableStream;
            if (this._queue.length > 0) {
              const chunk = DequeueValue(this);
              if (this._closeRequested && this._queue.length === 0) {
                ReadableStreamDefaultControllerClearAlgorithms(this);
                ReadableStreamClose(stream);
              } else {
                ReadableStreamDefaultControllerCallPullIfNeeded(this);
              }
              readRequest._chunkSteps(chunk);
            } else {
              ReadableStreamAddReadRequest(stream, readRequest);
              ReadableStreamDefaultControllerCallPullIfNeeded(this);
            }
          }
        }
        Object.defineProperties(ReadableStreamDefaultController.prototype, {
          close: { enumerable: true },
          enqueue: { enumerable: true },
          error: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamDefaultController",
            configurable: true
          });
        }
        function IsReadableStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledReadableStream")) {
            return false;
          }
          return x instanceof ReadableStreamDefaultController;
        }
        function ReadableStreamDefaultControllerCallPullIfNeeded(controller) {
          const shouldPull = ReadableStreamDefaultControllerShouldCallPull(controller);
          if (!shouldPull) {
            return;
          }
          if (controller._pulling) {
            controller._pullAgain = true;
            return;
          }
          controller._pulling = true;
          const pullPromise = controller._pullAlgorithm();
          uponPromise(pullPromise, () => {
            controller._pulling = false;
            if (controller._pullAgain) {
              controller._pullAgain = false;
              ReadableStreamDefaultControllerCallPullIfNeeded(controller);
            }
          }, (e) => {
            ReadableStreamDefaultControllerError(controller, e);
          });
        }
        function ReadableStreamDefaultControllerShouldCallPull(controller) {
          const stream = controller._controlledReadableStream;
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return false;
          }
          if (!controller._started) {
            return false;
          }
          if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            return true;
          }
          const desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
          if (desiredSize > 0) {
            return true;
          }
          return false;
        }
        function ReadableStreamDefaultControllerClearAlgorithms(controller) {
          controller._pullAlgorithm = void 0;
          controller._cancelAlgorithm = void 0;
          controller._strategySizeAlgorithm = void 0;
        }
        function ReadableStreamDefaultControllerClose(controller) {
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return;
          }
          const stream = controller._controlledReadableStream;
          controller._closeRequested = true;
          if (controller._queue.length === 0) {
            ReadableStreamDefaultControllerClearAlgorithms(controller);
            ReadableStreamClose(stream);
          }
        }
        function ReadableStreamDefaultControllerEnqueue(controller, chunk) {
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return;
          }
          const stream = controller._controlledReadableStream;
          if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            ReadableStreamFulfillReadRequest(stream, chunk, false);
          } else {
            let chunkSize;
            try {
              chunkSize = controller._strategySizeAlgorithm(chunk);
            } catch (chunkSizeE) {
              ReadableStreamDefaultControllerError(controller, chunkSizeE);
              throw chunkSizeE;
            }
            try {
              EnqueueValueWithSize(controller, chunk, chunkSize);
            } catch (enqueueE) {
              ReadableStreamDefaultControllerError(controller, enqueueE);
              throw enqueueE;
            }
          }
          ReadableStreamDefaultControllerCallPullIfNeeded(controller);
        }
        function ReadableStreamDefaultControllerError(controller, e) {
          const stream = controller._controlledReadableStream;
          if (stream._state !== "readable") {
            return;
          }
          ResetQueue(controller);
          ReadableStreamDefaultControllerClearAlgorithms(controller);
          ReadableStreamError(stream, e);
        }
        function ReadableStreamDefaultControllerGetDesiredSize(controller) {
          const state = controller._controlledReadableStream._state;
          if (state === "errored") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function ReadableStreamDefaultControllerHasBackpressure(controller) {
          if (ReadableStreamDefaultControllerShouldCallPull(controller)) {
            return false;
          }
          return true;
        }
        function ReadableStreamDefaultControllerCanCloseOrEnqueue(controller) {
          const state = controller._controlledReadableStream._state;
          if (!controller._closeRequested && state === "readable") {
            return true;
          }
          return false;
        }
        function SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm) {
          controller._controlledReadableStream = stream;
          controller._queue = void 0;
          controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._started = false;
          controller._closeRequested = false;
          controller._pullAgain = false;
          controller._pulling = false;
          controller._strategySizeAlgorithm = sizeAlgorithm;
          controller._strategyHWM = highWaterMark;
          controller._pullAlgorithm = pullAlgorithm;
          controller._cancelAlgorithm = cancelAlgorithm;
          stream._readableStreamController = controller;
          const startResult = startAlgorithm();
          uponPromise(promiseResolvedWith(startResult), () => {
            controller._started = true;
            ReadableStreamDefaultControllerCallPullIfNeeded(controller);
          }, (r) => {
            ReadableStreamDefaultControllerError(controller, r);
          });
        }
        function SetUpReadableStreamDefaultControllerFromUnderlyingSource(stream, underlyingSource, highWaterMark, sizeAlgorithm) {
          const controller = Object.create(ReadableStreamDefaultController.prototype);
          let startAlgorithm = () => void 0;
          let pullAlgorithm = () => promiseResolvedWith(void 0);
          let cancelAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingSource.start !== void 0) {
            startAlgorithm = () => underlyingSource.start(controller);
          }
          if (underlyingSource.pull !== void 0) {
            pullAlgorithm = () => underlyingSource.pull(controller);
          }
          if (underlyingSource.cancel !== void 0) {
            cancelAlgorithm = (reason) => underlyingSource.cancel(reason);
          }
          SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
        }
        function defaultControllerBrandCheckException$1(name) {
          return new TypeError(`ReadableStreamDefaultController.prototype.${name} can only be used on a ReadableStreamDefaultController`);
        }
        function ReadableStreamTee(stream, cloneForBranch2) {
          if (IsReadableByteStreamController(stream._readableStreamController)) {
            return ReadableByteStreamTee(stream);
          }
          return ReadableStreamDefaultTee(stream);
        }
        function ReadableStreamDefaultTee(stream, cloneForBranch2) {
          const reader = AcquireReadableStreamDefaultReader(stream);
          let reading = false;
          let canceled1 = false;
          let canceled2 = false;
          let reason1;
          let reason2;
          let branch1;
          let branch2;
          let resolveCancelPromise;
          const cancelPromise = newPromise((resolve3) => {
            resolveCancelPromise = resolve3;
          });
          function pullAlgorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const readRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const chunk1 = chunk;
                  const chunk2 = chunk;
                  if (!canceled1) {
                    ReadableStreamDefaultControllerEnqueue(branch1._readableStreamController, chunk1);
                  }
                  if (!canceled2) {
                    ReadableStreamDefaultControllerEnqueue(branch2._readableStreamController, chunk2);
                  }
                });
              },
              _closeSteps: () => {
                reading = false;
                if (!canceled1) {
                  ReadableStreamDefaultControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                  ReadableStreamDefaultControllerClose(branch2._readableStreamController);
                }
                if (!canceled1 || !canceled2) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
            return promiseResolvedWith(void 0);
          }
          function cancel1Algorithm(reason) {
            canceled1 = true;
            reason1 = reason;
            if (canceled2) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function cancel2Algorithm(reason) {
            canceled2 = true;
            reason2 = reason;
            if (canceled1) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function startAlgorithm() {
          }
          branch1 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel1Algorithm);
          branch2 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel2Algorithm);
          uponRejection(reader._closedPromise, (r) => {
            ReadableStreamDefaultControllerError(branch1._readableStreamController, r);
            ReadableStreamDefaultControllerError(branch2._readableStreamController, r);
            if (!canceled1 || !canceled2) {
              resolveCancelPromise(void 0);
            }
          });
          return [branch1, branch2];
        }
        function ReadableByteStreamTee(stream) {
          let reader = AcquireReadableStreamDefaultReader(stream);
          let reading = false;
          let canceled1 = false;
          let canceled2 = false;
          let reason1;
          let reason2;
          let branch1;
          let branch2;
          let resolveCancelPromise;
          const cancelPromise = newPromise((resolve3) => {
            resolveCancelPromise = resolve3;
          });
          function forwardReaderError(thisReader) {
            uponRejection(thisReader._closedPromise, (r) => {
              if (thisReader !== reader) {
                return;
              }
              ReadableByteStreamControllerError(branch1._readableStreamController, r);
              ReadableByteStreamControllerError(branch2._readableStreamController, r);
              if (!canceled1 || !canceled2) {
                resolveCancelPromise(void 0);
              }
            });
          }
          function pullWithDefaultReader() {
            if (IsReadableStreamBYOBReader(reader)) {
              ReadableStreamReaderGenericRelease(reader);
              reader = AcquireReadableStreamDefaultReader(stream);
              forwardReaderError(reader);
            }
            const readRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const chunk1 = chunk;
                  let chunk2 = chunk;
                  if (!canceled1 && !canceled2) {
                    try {
                      chunk2 = CloneAsUint8Array(chunk);
                    } catch (cloneE) {
                      ReadableByteStreamControllerError(branch1._readableStreamController, cloneE);
                      ReadableByteStreamControllerError(branch2._readableStreamController, cloneE);
                      resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                      return;
                    }
                  }
                  if (!canceled1) {
                    ReadableByteStreamControllerEnqueue(branch1._readableStreamController, chunk1);
                  }
                  if (!canceled2) {
                    ReadableByteStreamControllerEnqueue(branch2._readableStreamController, chunk2);
                  }
                });
              },
              _closeSteps: () => {
                reading = false;
                if (!canceled1) {
                  ReadableByteStreamControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                  ReadableByteStreamControllerClose(branch2._readableStreamController);
                }
                if (branch1._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(branch1._readableStreamController, 0);
                }
                if (branch2._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(branch2._readableStreamController, 0);
                }
                if (!canceled1 || !canceled2) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
          }
          function pullWithBYOBReader(view, forBranch2) {
            if (IsReadableStreamDefaultReader(reader)) {
              ReadableStreamReaderGenericRelease(reader);
              reader = AcquireReadableStreamBYOBReader(stream);
              forwardReaderError(reader);
            }
            const byobBranch = forBranch2 ? branch2 : branch1;
            const otherBranch = forBranch2 ? branch1 : branch2;
            const readIntoRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const byobCanceled = forBranch2 ? canceled2 : canceled1;
                  const otherCanceled = forBranch2 ? canceled1 : canceled2;
                  if (!otherCanceled) {
                    let clonedChunk;
                    try {
                      clonedChunk = CloneAsUint8Array(chunk);
                    } catch (cloneE) {
                      ReadableByteStreamControllerError(byobBranch._readableStreamController, cloneE);
                      ReadableByteStreamControllerError(otherBranch._readableStreamController, cloneE);
                      resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                      return;
                    }
                    if (!byobCanceled) {
                      ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                    }
                    ReadableByteStreamControllerEnqueue(otherBranch._readableStreamController, clonedChunk);
                  } else if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                });
              },
              _closeSteps: (chunk) => {
                reading = false;
                const byobCanceled = forBranch2 ? canceled2 : canceled1;
                const otherCanceled = forBranch2 ? canceled1 : canceled2;
                if (!byobCanceled) {
                  ReadableByteStreamControllerClose(byobBranch._readableStreamController);
                }
                if (!otherCanceled) {
                  ReadableByteStreamControllerClose(otherBranch._readableStreamController);
                }
                if (chunk !== void 0) {
                  if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                  if (!otherCanceled && otherBranch._readableStreamController._pendingPullIntos.length > 0) {
                    ReadableByteStreamControllerRespond(otherBranch._readableStreamController, 0);
                  }
                }
                if (!byobCanceled || !otherCanceled) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamBYOBReaderRead(reader, view, readIntoRequest);
          }
          function pull1Algorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch1._readableStreamController);
            if (byobRequest === null) {
              pullWithDefaultReader();
            } else {
              pullWithBYOBReader(byobRequest._view, false);
            }
            return promiseResolvedWith(void 0);
          }
          function pull2Algorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch2._readableStreamController);
            if (byobRequest === null) {
              pullWithDefaultReader();
            } else {
              pullWithBYOBReader(byobRequest._view, true);
            }
            return promiseResolvedWith(void 0);
          }
          function cancel1Algorithm(reason) {
            canceled1 = true;
            reason1 = reason;
            if (canceled2) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function cancel2Algorithm(reason) {
            canceled2 = true;
            reason2 = reason;
            if (canceled1) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function startAlgorithm() {
            return;
          }
          branch1 = CreateReadableByteStream(startAlgorithm, pull1Algorithm, cancel1Algorithm);
          branch2 = CreateReadableByteStream(startAlgorithm, pull2Algorithm, cancel2Algorithm);
          forwardReaderError(reader);
          return [branch1, branch2];
        }
        function convertUnderlyingDefaultOrByteSource(source, context) {
          assertDictionary(source, context);
          const original = source;
          const autoAllocateChunkSize = original === null || original === void 0 ? void 0 : original.autoAllocateChunkSize;
          const cancel = original === null || original === void 0 ? void 0 : original.cancel;
          const pull = original === null || original === void 0 ? void 0 : original.pull;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const type = original === null || original === void 0 ? void 0 : original.type;
          return {
            autoAllocateChunkSize: autoAllocateChunkSize === void 0 ? void 0 : convertUnsignedLongLongWithEnforceRange(autoAllocateChunkSize, `${context} has member 'autoAllocateChunkSize' that`),
            cancel: cancel === void 0 ? void 0 : convertUnderlyingSourceCancelCallback(cancel, original, `${context} has member 'cancel' that`),
            pull: pull === void 0 ? void 0 : convertUnderlyingSourcePullCallback(pull, original, `${context} has member 'pull' that`),
            start: start === void 0 ? void 0 : convertUnderlyingSourceStartCallback(start, original, `${context} has member 'start' that`),
            type: type === void 0 ? void 0 : convertReadableStreamType(type, `${context} has member 'type' that`)
          };
        }
        function convertUnderlyingSourceCancelCallback(fn, original, context) {
          assertFunction(fn, context);
          return (reason) => promiseCall(fn, original, [reason]);
        }
        function convertUnderlyingSourcePullCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => promiseCall(fn, original, [controller]);
        }
        function convertUnderlyingSourceStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertReadableStreamType(type, context) {
          type = `${type}`;
          if (type !== "bytes") {
            throw new TypeError(`${context} '${type}' is not a valid enumeration value for ReadableStreamType`);
          }
          return type;
        }
        function convertReaderOptions(options2, context) {
          assertDictionary(options2, context);
          const mode = options2 === null || options2 === void 0 ? void 0 : options2.mode;
          return {
            mode: mode === void 0 ? void 0 : convertReadableStreamReaderMode(mode, `${context} has member 'mode' that`)
          };
        }
        function convertReadableStreamReaderMode(mode, context) {
          mode = `${mode}`;
          if (mode !== "byob") {
            throw new TypeError(`${context} '${mode}' is not a valid enumeration value for ReadableStreamReaderMode`);
          }
          return mode;
        }
        function convertIteratorOptions(options2, context) {
          assertDictionary(options2, context);
          const preventCancel = options2 === null || options2 === void 0 ? void 0 : options2.preventCancel;
          return { preventCancel: Boolean(preventCancel) };
        }
        function convertPipeOptions(options2, context) {
          assertDictionary(options2, context);
          const preventAbort = options2 === null || options2 === void 0 ? void 0 : options2.preventAbort;
          const preventCancel = options2 === null || options2 === void 0 ? void 0 : options2.preventCancel;
          const preventClose = options2 === null || options2 === void 0 ? void 0 : options2.preventClose;
          const signal = options2 === null || options2 === void 0 ? void 0 : options2.signal;
          if (signal !== void 0) {
            assertAbortSignal(signal, `${context} has member 'signal' that`);
          }
          return {
            preventAbort: Boolean(preventAbort),
            preventCancel: Boolean(preventCancel),
            preventClose: Boolean(preventClose),
            signal
          };
        }
        function assertAbortSignal(signal, context) {
          if (!isAbortSignal2(signal)) {
            throw new TypeError(`${context} is not an AbortSignal.`);
          }
        }
        function convertReadableWritablePair(pair, context) {
          assertDictionary(pair, context);
          const readable = pair === null || pair === void 0 ? void 0 : pair.readable;
          assertRequiredField(readable, "readable", "ReadableWritablePair");
          assertReadableStream(readable, `${context} has member 'readable' that`);
          const writable3 = pair === null || pair === void 0 ? void 0 : pair.writable;
          assertRequiredField(writable3, "writable", "ReadableWritablePair");
          assertWritableStream(writable3, `${context} has member 'writable' that`);
          return { readable, writable: writable3 };
        }
        class ReadableStream2 {
          constructor(rawUnderlyingSource = {}, rawStrategy = {}) {
            if (rawUnderlyingSource === void 0) {
              rawUnderlyingSource = null;
            } else {
              assertObject(rawUnderlyingSource, "First parameter");
            }
            const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
            const underlyingSource = convertUnderlyingDefaultOrByteSource(rawUnderlyingSource, "First parameter");
            InitializeReadableStream(this);
            if (underlyingSource.type === "bytes") {
              if (strategy.size !== void 0) {
                throw new RangeError("The strategy for a byte stream cannot have a size function");
              }
              const highWaterMark = ExtractHighWaterMark(strategy, 0);
              SetUpReadableByteStreamControllerFromUnderlyingSource(this, underlyingSource, highWaterMark);
            } else {
              const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
              const highWaterMark = ExtractHighWaterMark(strategy, 1);
              SetUpReadableStreamDefaultControllerFromUnderlyingSource(this, underlyingSource, highWaterMark, sizeAlgorithm);
            }
          }
          get locked() {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("locked");
            }
            return IsReadableStreamLocked(this);
          }
          cancel(reason = void 0) {
            if (!IsReadableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$1("cancel"));
            }
            if (IsReadableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot cancel a stream that already has a reader"));
            }
            return ReadableStreamCancel(this, reason);
          }
          getReader(rawOptions = void 0) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("getReader");
            }
            const options2 = convertReaderOptions(rawOptions, "First parameter");
            if (options2.mode === void 0) {
              return AcquireReadableStreamDefaultReader(this);
            }
            return AcquireReadableStreamBYOBReader(this);
          }
          pipeThrough(rawTransform, rawOptions = {}) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("pipeThrough");
            }
            assertRequiredArgument(rawTransform, 1, "pipeThrough");
            const transform2 = convertReadableWritablePair(rawTransform, "First parameter");
            const options2 = convertPipeOptions(rawOptions, "Second parameter");
            if (IsReadableStreamLocked(this)) {
              throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
            }
            if (IsWritableStreamLocked(transform2.writable)) {
              throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
            }
            const promise = ReadableStreamPipeTo(this, transform2.writable, options2.preventClose, options2.preventAbort, options2.preventCancel, options2.signal);
            setPromiseIsHandledToTrue(promise);
            return transform2.readable;
          }
          pipeTo(destination, rawOptions = {}) {
            if (!IsReadableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$1("pipeTo"));
            }
            if (destination === void 0) {
              return promiseRejectedWith(`Parameter 1 is required in 'pipeTo'.`);
            }
            if (!IsWritableStream(destination)) {
              return promiseRejectedWith(new TypeError(`ReadableStream.prototype.pipeTo's first argument must be a WritableStream`));
            }
            let options2;
            try {
              options2 = convertPipeOptions(rawOptions, "Second parameter");
            } catch (e) {
              return promiseRejectedWith(e);
            }
            if (IsReadableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream"));
            }
            if (IsWritableStreamLocked(destination)) {
              return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream"));
            }
            return ReadableStreamPipeTo(this, destination, options2.preventClose, options2.preventAbort, options2.preventCancel, options2.signal);
          }
          tee() {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("tee");
            }
            const branches = ReadableStreamTee(this);
            return CreateArrayFromList(branches);
          }
          values(rawOptions = void 0) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("values");
            }
            const options2 = convertIteratorOptions(rawOptions, "First parameter");
            return AcquireReadableStreamAsyncIterator(this, options2.preventCancel);
          }
        }
        Object.defineProperties(ReadableStream2.prototype, {
          cancel: { enumerable: true },
          getReader: { enumerable: true },
          pipeThrough: { enumerable: true },
          pipeTo: { enumerable: true },
          tee: { enumerable: true },
          values: { enumerable: true },
          locked: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStream2.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStream",
            configurable: true
          });
        }
        if (typeof SymbolPolyfill.asyncIterator === "symbol") {
          Object.defineProperty(ReadableStream2.prototype, SymbolPolyfill.asyncIterator, {
            value: ReadableStream2.prototype.values,
            writable: true,
            configurable: true
          });
        }
        function CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
          const stream = Object.create(ReadableStream2.prototype);
          InitializeReadableStream(stream);
          const controller = Object.create(ReadableStreamDefaultController.prototype);
          SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
          return stream;
        }
        function CreateReadableByteStream(startAlgorithm, pullAlgorithm, cancelAlgorithm) {
          const stream = Object.create(ReadableStream2.prototype);
          InitializeReadableStream(stream);
          const controller = Object.create(ReadableByteStreamController.prototype);
          SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, 0, void 0);
          return stream;
        }
        function InitializeReadableStream(stream) {
          stream._state = "readable";
          stream._reader = void 0;
          stream._storedError = void 0;
          stream._disturbed = false;
        }
        function IsReadableStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readableStreamController")) {
            return false;
          }
          return x instanceof ReadableStream2;
        }
        function IsReadableStreamLocked(stream) {
          if (stream._reader === void 0) {
            return false;
          }
          return true;
        }
        function ReadableStreamCancel(stream, reason) {
          stream._disturbed = true;
          if (stream._state === "closed") {
            return promiseResolvedWith(void 0);
          }
          if (stream._state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          ReadableStreamClose(stream);
          const reader = stream._reader;
          if (reader !== void 0 && IsReadableStreamBYOBReader(reader)) {
            reader._readIntoRequests.forEach((readIntoRequest) => {
              readIntoRequest._closeSteps(void 0);
            });
            reader._readIntoRequests = new SimpleQueue();
          }
          const sourceCancelPromise = stream._readableStreamController[CancelSteps](reason);
          return transformPromiseWith(sourceCancelPromise, noop4);
        }
        function ReadableStreamClose(stream) {
          stream._state = "closed";
          const reader = stream._reader;
          if (reader === void 0) {
            return;
          }
          defaultReaderClosedPromiseResolve(reader);
          if (IsReadableStreamDefaultReader(reader)) {
            reader._readRequests.forEach((readRequest) => {
              readRequest._closeSteps();
            });
            reader._readRequests = new SimpleQueue();
          }
        }
        function ReadableStreamError(stream, e) {
          stream._state = "errored";
          stream._storedError = e;
          const reader = stream._reader;
          if (reader === void 0) {
            return;
          }
          defaultReaderClosedPromiseReject(reader, e);
          if (IsReadableStreamDefaultReader(reader)) {
            reader._readRequests.forEach((readRequest) => {
              readRequest._errorSteps(e);
            });
            reader._readRequests = new SimpleQueue();
          } else {
            reader._readIntoRequests.forEach((readIntoRequest) => {
              readIntoRequest._errorSteps(e);
            });
            reader._readIntoRequests = new SimpleQueue();
          }
        }
        function streamBrandCheckException$1(name) {
          return new TypeError(`ReadableStream.prototype.${name} can only be used on a ReadableStream`);
        }
        function convertQueuingStrategyInit(init2, context) {
          assertDictionary(init2, context);
          const highWaterMark = init2 === null || init2 === void 0 ? void 0 : init2.highWaterMark;
          assertRequiredField(highWaterMark, "highWaterMark", "QueuingStrategyInit");
          return {
            highWaterMark: convertUnrestrictedDouble(highWaterMark)
          };
        }
        const byteLengthSizeFunction = (chunk) => {
          return chunk.byteLength;
        };
        Object.defineProperty(byteLengthSizeFunction, "name", {
          value: "size",
          configurable: true
        });
        class ByteLengthQueuingStrategy {
          constructor(options2) {
            assertRequiredArgument(options2, 1, "ByteLengthQueuingStrategy");
            options2 = convertQueuingStrategyInit(options2, "First parameter");
            this._byteLengthQueuingStrategyHighWaterMark = options2.highWaterMark;
          }
          get highWaterMark() {
            if (!IsByteLengthQueuingStrategy(this)) {
              throw byteLengthBrandCheckException("highWaterMark");
            }
            return this._byteLengthQueuingStrategyHighWaterMark;
          }
          get size() {
            if (!IsByteLengthQueuingStrategy(this)) {
              throw byteLengthBrandCheckException("size");
            }
            return byteLengthSizeFunction;
          }
        }
        Object.defineProperties(ByteLengthQueuingStrategy.prototype, {
          highWaterMark: { enumerable: true },
          size: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ByteLengthQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
            value: "ByteLengthQueuingStrategy",
            configurable: true
          });
        }
        function byteLengthBrandCheckException(name) {
          return new TypeError(`ByteLengthQueuingStrategy.prototype.${name} can only be used on a ByteLengthQueuingStrategy`);
        }
        function IsByteLengthQueuingStrategy(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_byteLengthQueuingStrategyHighWaterMark")) {
            return false;
          }
          return x instanceof ByteLengthQueuingStrategy;
        }
        const countSizeFunction = () => {
          return 1;
        };
        Object.defineProperty(countSizeFunction, "name", {
          value: "size",
          configurable: true
        });
        class CountQueuingStrategy {
          constructor(options2) {
            assertRequiredArgument(options2, 1, "CountQueuingStrategy");
            options2 = convertQueuingStrategyInit(options2, "First parameter");
            this._countQueuingStrategyHighWaterMark = options2.highWaterMark;
          }
          get highWaterMark() {
            if (!IsCountQueuingStrategy(this)) {
              throw countBrandCheckException("highWaterMark");
            }
            return this._countQueuingStrategyHighWaterMark;
          }
          get size() {
            if (!IsCountQueuingStrategy(this)) {
              throw countBrandCheckException("size");
            }
            return countSizeFunction;
          }
        }
        Object.defineProperties(CountQueuingStrategy.prototype, {
          highWaterMark: { enumerable: true },
          size: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(CountQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
            value: "CountQueuingStrategy",
            configurable: true
          });
        }
        function countBrandCheckException(name) {
          return new TypeError(`CountQueuingStrategy.prototype.${name} can only be used on a CountQueuingStrategy`);
        }
        function IsCountQueuingStrategy(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_countQueuingStrategyHighWaterMark")) {
            return false;
          }
          return x instanceof CountQueuingStrategy;
        }
        function convertTransformer(original, context) {
          assertDictionary(original, context);
          const flush = original === null || original === void 0 ? void 0 : original.flush;
          const readableType = original === null || original === void 0 ? void 0 : original.readableType;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const transform2 = original === null || original === void 0 ? void 0 : original.transform;
          const writableType = original === null || original === void 0 ? void 0 : original.writableType;
          return {
            flush: flush === void 0 ? void 0 : convertTransformerFlushCallback(flush, original, `${context} has member 'flush' that`),
            readableType,
            start: start === void 0 ? void 0 : convertTransformerStartCallback(start, original, `${context} has member 'start' that`),
            transform: transform2 === void 0 ? void 0 : convertTransformerTransformCallback(transform2, original, `${context} has member 'transform' that`),
            writableType
          };
        }
        function convertTransformerFlushCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => promiseCall(fn, original, [controller]);
        }
        function convertTransformerStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertTransformerTransformCallback(fn, original, context) {
          assertFunction(fn, context);
          return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
        }
        class TransformStream {
          constructor(rawTransformer = {}, rawWritableStrategy = {}, rawReadableStrategy = {}) {
            if (rawTransformer === void 0) {
              rawTransformer = null;
            }
            const writableStrategy = convertQueuingStrategy(rawWritableStrategy, "Second parameter");
            const readableStrategy = convertQueuingStrategy(rawReadableStrategy, "Third parameter");
            const transformer = convertTransformer(rawTransformer, "First parameter");
            if (transformer.readableType !== void 0) {
              throw new RangeError("Invalid readableType specified");
            }
            if (transformer.writableType !== void 0) {
              throw new RangeError("Invalid writableType specified");
            }
            const readableHighWaterMark = ExtractHighWaterMark(readableStrategy, 0);
            const readableSizeAlgorithm = ExtractSizeAlgorithm(readableStrategy);
            const writableHighWaterMark = ExtractHighWaterMark(writableStrategy, 1);
            const writableSizeAlgorithm = ExtractSizeAlgorithm(writableStrategy);
            let startPromise_resolve;
            const startPromise = newPromise((resolve3) => {
              startPromise_resolve = resolve3;
            });
            InitializeTransformStream(this, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
            SetUpTransformStreamDefaultControllerFromTransformer(this, transformer);
            if (transformer.start !== void 0) {
              startPromise_resolve(transformer.start(this._transformStreamController));
            } else {
              startPromise_resolve(void 0);
            }
          }
          get readable() {
            if (!IsTransformStream(this)) {
              throw streamBrandCheckException("readable");
            }
            return this._readable;
          }
          get writable() {
            if (!IsTransformStream(this)) {
              throw streamBrandCheckException("writable");
            }
            return this._writable;
          }
        }
        Object.defineProperties(TransformStream.prototype, {
          readable: { enumerable: true },
          writable: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(TransformStream.prototype, SymbolPolyfill.toStringTag, {
            value: "TransformStream",
            configurable: true
          });
        }
        function InitializeTransformStream(stream, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm) {
          function startAlgorithm() {
            return startPromise;
          }
          function writeAlgorithm(chunk) {
            return TransformStreamDefaultSinkWriteAlgorithm(stream, chunk);
          }
          function abortAlgorithm(reason) {
            return TransformStreamDefaultSinkAbortAlgorithm(stream, reason);
          }
          function closeAlgorithm() {
            return TransformStreamDefaultSinkCloseAlgorithm(stream);
          }
          stream._writable = CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, writableHighWaterMark, writableSizeAlgorithm);
          function pullAlgorithm() {
            return TransformStreamDefaultSourcePullAlgorithm(stream);
          }
          function cancelAlgorithm(reason) {
            TransformStreamErrorWritableAndUnblockWrite(stream, reason);
            return promiseResolvedWith(void 0);
          }
          stream._readable = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
          stream._backpressure = void 0;
          stream._backpressureChangePromise = void 0;
          stream._backpressureChangePromise_resolve = void 0;
          TransformStreamSetBackpressure(stream, true);
          stream._transformStreamController = void 0;
        }
        function IsTransformStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_transformStreamController")) {
            return false;
          }
          return x instanceof TransformStream;
        }
        function TransformStreamError(stream, e) {
          ReadableStreamDefaultControllerError(stream._readable._readableStreamController, e);
          TransformStreamErrorWritableAndUnblockWrite(stream, e);
        }
        function TransformStreamErrorWritableAndUnblockWrite(stream, e) {
          TransformStreamDefaultControllerClearAlgorithms(stream._transformStreamController);
          WritableStreamDefaultControllerErrorIfNeeded(stream._writable._writableStreamController, e);
          if (stream._backpressure) {
            TransformStreamSetBackpressure(stream, false);
          }
        }
        function TransformStreamSetBackpressure(stream, backpressure) {
          if (stream._backpressureChangePromise !== void 0) {
            stream._backpressureChangePromise_resolve();
          }
          stream._backpressureChangePromise = newPromise((resolve3) => {
            stream._backpressureChangePromise_resolve = resolve3;
          });
          stream._backpressure = backpressure;
        }
        class TransformStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get desiredSize() {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("desiredSize");
            }
            const readableController = this._controlledTransformStream._readable._readableStreamController;
            return ReadableStreamDefaultControllerGetDesiredSize(readableController);
          }
          enqueue(chunk = void 0) {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("enqueue");
            }
            TransformStreamDefaultControllerEnqueue(this, chunk);
          }
          error(reason = void 0) {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("error");
            }
            TransformStreamDefaultControllerError(this, reason);
          }
          terminate() {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("terminate");
            }
            TransformStreamDefaultControllerTerminate(this);
          }
        }
        Object.defineProperties(TransformStreamDefaultController.prototype, {
          enqueue: { enumerable: true },
          error: { enumerable: true },
          terminate: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(TransformStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "TransformStreamDefaultController",
            configurable: true
          });
        }
        function IsTransformStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledTransformStream")) {
            return false;
          }
          return x instanceof TransformStreamDefaultController;
        }
        function SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm) {
          controller._controlledTransformStream = stream;
          stream._transformStreamController = controller;
          controller._transformAlgorithm = transformAlgorithm;
          controller._flushAlgorithm = flushAlgorithm;
        }
        function SetUpTransformStreamDefaultControllerFromTransformer(stream, transformer) {
          const controller = Object.create(TransformStreamDefaultController.prototype);
          let transformAlgorithm = (chunk) => {
            try {
              TransformStreamDefaultControllerEnqueue(controller, chunk);
              return promiseResolvedWith(void 0);
            } catch (transformResultE) {
              return promiseRejectedWith(transformResultE);
            }
          };
          let flushAlgorithm = () => promiseResolvedWith(void 0);
          if (transformer.transform !== void 0) {
            transformAlgorithm = (chunk) => transformer.transform(chunk, controller);
          }
          if (transformer.flush !== void 0) {
            flushAlgorithm = () => transformer.flush(controller);
          }
          SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm);
        }
        function TransformStreamDefaultControllerClearAlgorithms(controller) {
          controller._transformAlgorithm = void 0;
          controller._flushAlgorithm = void 0;
        }
        function TransformStreamDefaultControllerEnqueue(controller, chunk) {
          const stream = controller._controlledTransformStream;
          const readableController = stream._readable._readableStreamController;
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(readableController)) {
            throw new TypeError("Readable side is not in a state that permits enqueue");
          }
          try {
            ReadableStreamDefaultControllerEnqueue(readableController, chunk);
          } catch (e) {
            TransformStreamErrorWritableAndUnblockWrite(stream, e);
            throw stream._readable._storedError;
          }
          const backpressure = ReadableStreamDefaultControllerHasBackpressure(readableController);
          if (backpressure !== stream._backpressure) {
            TransformStreamSetBackpressure(stream, true);
          }
        }
        function TransformStreamDefaultControllerError(controller, e) {
          TransformStreamError(controller._controlledTransformStream, e);
        }
        function TransformStreamDefaultControllerPerformTransform(controller, chunk) {
          const transformPromise = controller._transformAlgorithm(chunk);
          return transformPromiseWith(transformPromise, void 0, (r) => {
            TransformStreamError(controller._controlledTransformStream, r);
            throw r;
          });
        }
        function TransformStreamDefaultControllerTerminate(controller) {
          const stream = controller._controlledTransformStream;
          const readableController = stream._readable._readableStreamController;
          ReadableStreamDefaultControllerClose(readableController);
          const error2 = new TypeError("TransformStream terminated");
          TransformStreamErrorWritableAndUnblockWrite(stream, error2);
        }
        function TransformStreamDefaultSinkWriteAlgorithm(stream, chunk) {
          const controller = stream._transformStreamController;
          if (stream._backpressure) {
            const backpressureChangePromise = stream._backpressureChangePromise;
            return transformPromiseWith(backpressureChangePromise, () => {
              const writable3 = stream._writable;
              const state = writable3._state;
              if (state === "erroring") {
                throw writable3._storedError;
              }
              return TransformStreamDefaultControllerPerformTransform(controller, chunk);
            });
          }
          return TransformStreamDefaultControllerPerformTransform(controller, chunk);
        }
        function TransformStreamDefaultSinkAbortAlgorithm(stream, reason) {
          TransformStreamError(stream, reason);
          return promiseResolvedWith(void 0);
        }
        function TransformStreamDefaultSinkCloseAlgorithm(stream) {
          const readable = stream._readable;
          const controller = stream._transformStreamController;
          const flushPromise = controller._flushAlgorithm();
          TransformStreamDefaultControllerClearAlgorithms(controller);
          return transformPromiseWith(flushPromise, () => {
            if (readable._state === "errored") {
              throw readable._storedError;
            }
            ReadableStreamDefaultControllerClose(readable._readableStreamController);
          }, (r) => {
            TransformStreamError(stream, r);
            throw readable._storedError;
          });
        }
        function TransformStreamDefaultSourcePullAlgorithm(stream) {
          TransformStreamSetBackpressure(stream, false);
          return stream._backpressureChangePromise;
        }
        function defaultControllerBrandCheckException(name) {
          return new TypeError(`TransformStreamDefaultController.prototype.${name} can only be used on a TransformStreamDefaultController`);
        }
        function streamBrandCheckException(name) {
          return new TypeError(`TransformStream.prototype.${name} can only be used on a TransformStream`);
        }
        exports2.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
        exports2.CountQueuingStrategy = CountQueuingStrategy;
        exports2.ReadableByteStreamController = ReadableByteStreamController;
        exports2.ReadableStream = ReadableStream2;
        exports2.ReadableStreamBYOBReader = ReadableStreamBYOBReader;
        exports2.ReadableStreamBYOBRequest = ReadableStreamBYOBRequest;
        exports2.ReadableStreamDefaultController = ReadableStreamDefaultController;
        exports2.ReadableStreamDefaultReader = ReadableStreamDefaultReader;
        exports2.TransformStream = TransformStream;
        exports2.TransformStreamDefaultController = TransformStreamDefaultController;
        exports2.WritableStream = WritableStream;
        exports2.WritableStreamDefaultController = WritableStreamDefaultController;
        exports2.WritableStreamDefaultWriter = WritableStreamDefaultWriter;
        Object.defineProperty(exports2, "__esModule", { value: true });
      });
    })(ponyfill_es2018, ponyfill_es2018.exports);
    POOL_SIZE$1 = 65536;
    if (!globalThis.ReadableStream) {
      try {
        const process2 = __require("process");
        const { emitWarning } = process2;
        try {
          process2.emitWarning = () => {
          };
          Object.assign(globalThis, __require("stream/web"));
          process2.emitWarning = emitWarning;
        } catch (error2) {
          process2.emitWarning = emitWarning;
          throw error2;
        }
      } catch (error2) {
        Object.assign(globalThis, ponyfill_es2018.exports);
      }
    }
    try {
      const { Blob: Blob3 } = __require("buffer");
      if (Blob3 && !Blob3.prototype.stream) {
        Blob3.prototype.stream = function name(params) {
          let position = 0;
          const blob = this;
          return new ReadableStream({
            type: "bytes",
            async pull(ctrl) {
              const chunk = blob.slice(position, Math.min(blob.size, position + POOL_SIZE$1));
              const buffer = await chunk.arrayBuffer();
              position += buffer.byteLength;
              ctrl.enqueue(new Uint8Array(buffer));
              if (position === blob.size) {
                ctrl.close();
              }
            }
          });
        };
      }
    } catch (error2) {
    }
    POOL_SIZE = 65536;
    _Blob = (_a = class {
      constructor(blobParts = [], options2 = {}) {
        __privateAdd(this, _parts, []);
        __privateAdd(this, _type, "");
        __privateAdd(this, _size, 0);
        if (typeof blobParts !== "object" || blobParts === null) {
          throw new TypeError("Failed to construct 'Blob': The provided value cannot be converted to a sequence.");
        }
        if (typeof blobParts[Symbol.iterator] !== "function") {
          throw new TypeError("Failed to construct 'Blob': The object must have a callable @@iterator property.");
        }
        if (typeof options2 !== "object" && typeof options2 !== "function") {
          throw new TypeError("Failed to construct 'Blob': parameter 2 cannot convert to dictionary.");
        }
        if (options2 === null)
          options2 = {};
        const encoder = new TextEncoder();
        for (const element of blobParts) {
          let part;
          if (ArrayBuffer.isView(element)) {
            part = new Uint8Array(element.buffer.slice(element.byteOffset, element.byteOffset + element.byteLength));
          } else if (element instanceof ArrayBuffer) {
            part = new Uint8Array(element.slice(0));
          } else if (element instanceof _a) {
            part = element;
          } else {
            part = encoder.encode(element);
          }
          __privateSet(this, _size, __privateGet(this, _size) + (ArrayBuffer.isView(part) ? part.byteLength : part.size));
          __privateGet(this, _parts).push(part);
        }
        const type = options2.type === void 0 ? "" : String(options2.type);
        __privateSet(this, _type, /^[\x20-\x7E]*$/.test(type) ? type : "");
      }
      get size() {
        return __privateGet(this, _size);
      }
      get type() {
        return __privateGet(this, _type);
      }
      async text() {
        const decoder = new TextDecoder();
        let str = "";
        for await (const part of toIterator(__privateGet(this, _parts), false)) {
          str += decoder.decode(part, { stream: true });
        }
        str += decoder.decode();
        return str;
      }
      async arrayBuffer() {
        const data = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of toIterator(__privateGet(this, _parts), false)) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return data.buffer;
      }
      stream() {
        const it = toIterator(__privateGet(this, _parts), true);
        return new globalThis.ReadableStream({
          type: "bytes",
          async pull(ctrl) {
            const chunk = await it.next();
            chunk.done ? ctrl.close() : ctrl.enqueue(chunk.value);
          },
          async cancel() {
            await it.return();
          }
        });
      }
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = __privateGet(this, _parts);
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          if (added >= span) {
            break;
          }
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            let chunk;
            if (ArrayBuffer.isView(part)) {
              chunk = part.subarray(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.byteLength;
            } else {
              chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.size;
            }
            relativeEnd -= size2;
            blobParts.push(chunk);
            relativeStart = 0;
          }
        }
        const blob = new _a([], { type: String(type).toLowerCase() });
        __privateSet(blob, _size, span);
        __privateSet(blob, _parts, blobParts);
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.constructor === "function" && (typeof object.stream === "function" || typeof object.arrayBuffer === "function") && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    }, _parts = new WeakMap(), _type = new WeakMap(), _size = new WeakMap(), _a);
    Object.defineProperties(_Blob.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    Blob2 = _Blob;
    Blob$1 = Blob2;
    FetchBaseError = class extends Error {
      constructor(message, type) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
      }
      get name() {
        return this.constructor.name;
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
    };
    FetchError = class extends FetchBaseError {
      constructor(message, type, systemError) {
        super(message, type);
        if (systemError) {
          this.code = this.errno = systemError.code;
          this.erroredSysCall = systemError.syscall;
        }
      }
    };
    NAME = Symbol.toStringTag;
    isURLSearchParameters = (object) => {
      return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
    };
    isBlob = (object) => {
      return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
    };
    isAbortSignal = (object) => {
      return typeof object === "object" && (object[NAME] === "AbortSignal" || object[NAME] === "EventTarget");
    };
    carriage = "\r\n";
    dashes = "-".repeat(2);
    carriageLength = Buffer.byteLength(carriage);
    getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
    getBoundary = () => randomBytes(8).toString("hex");
    INTERNALS$2 = Symbol("Body internals");
    Body = class {
      constructor(body, {
        size = 0
      } = {}) {
        let boundary = null;
        if (body === null) {
          body = null;
        } else if (isURLSearchParameters(body)) {
          body = Buffer.from(body.toString());
        } else if (isBlob(body))
          ;
        else if (Buffer.isBuffer(body))
          ;
        else if (types.isAnyArrayBuffer(body)) {
          body = Buffer.from(body);
        } else if (ArrayBuffer.isView(body)) {
          body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof Stream)
          ;
        else if (isFormData(body)) {
          boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
          body = Stream.Readable.from(formDataIterator(body, boundary));
        } else {
          body = Buffer.from(String(body));
        }
        this[INTERNALS$2] = {
          body,
          boundary,
          disturbed: false,
          error: null
        };
        this.size = size;
        if (body instanceof Stream) {
          body.on("error", (error_) => {
            const error2 = error_ instanceof FetchBaseError ? error_ : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${error_.message}`, "system", error_);
            this[INTERNALS$2].error = error2;
          });
        }
      }
      get body() {
        return this[INTERNALS$2].body;
      }
      get bodyUsed() {
        return this[INTERNALS$2].disturbed;
      }
      async arrayBuffer() {
        const { buffer, byteOffset, byteLength } = await consumeBody(this);
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
      async blob() {
        const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
        const buf = await this.buffer();
        return new Blob$1([buf], {
          type: ct
        });
      }
      async json() {
        const buffer = await consumeBody(this);
        return JSON.parse(buffer.toString());
      }
      async text() {
        const buffer = await consumeBody(this);
        return buffer.toString();
      }
      buffer() {
        return consumeBody(this);
      }
    };
    Object.defineProperties(Body.prototype, {
      body: { enumerable: true },
      bodyUsed: { enumerable: true },
      arrayBuffer: { enumerable: true },
      blob: { enumerable: true },
      json: { enumerable: true },
      text: { enumerable: true }
    });
    clone = (instance, highWaterMark) => {
      let p1;
      let p2;
      let { body } = instance;
      if (instance.bodyUsed) {
        throw new Error("cannot clone body after it is used");
      }
      if (body instanceof Stream && typeof body.getBoundary !== "function") {
        p1 = new PassThrough({ highWaterMark });
        p2 = new PassThrough({ highWaterMark });
        body.pipe(p1);
        body.pipe(p2);
        instance[INTERNALS$2].body = p1;
        body = p2;
      }
      return body;
    };
    extractContentType = (body, request) => {
      if (body === null) {
        return null;
      }
      if (typeof body === "string") {
        return "text/plain;charset=UTF-8";
      }
      if (isURLSearchParameters(body)) {
        return "application/x-www-form-urlencoded;charset=UTF-8";
      }
      if (isBlob(body)) {
        return body.type || null;
      }
      if (Buffer.isBuffer(body) || types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
        return null;
      }
      if (body && typeof body.getBoundary === "function") {
        return `multipart/form-data;boundary=${body.getBoundary()}`;
      }
      if (isFormData(body)) {
        return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
      }
      if (body instanceof Stream) {
        return null;
      }
      return "text/plain;charset=UTF-8";
    };
    getTotalBytes = (request) => {
      const { body } = request;
      if (body === null) {
        return 0;
      }
      if (isBlob(body)) {
        return body.size;
      }
      if (Buffer.isBuffer(body)) {
        return body.length;
      }
      if (body && typeof body.getLengthSync === "function") {
        return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
      }
      if (isFormData(body)) {
        return getFormDataLength(request[INTERNALS$2].boundary);
      }
      return null;
    };
    writeToStream = (dest, { body }) => {
      if (body === null) {
        dest.end();
      } else if (isBlob(body)) {
        Stream.Readable.from(body.stream()).pipe(dest);
      } else if (Buffer.isBuffer(body)) {
        dest.write(body);
        dest.end();
      } else {
        body.pipe(dest);
      }
    };
    validateHeaderName = typeof http.validateHeaderName === "function" ? http.validateHeaderName : (name) => {
      if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const error2 = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(error2, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw error2;
      }
    };
    validateHeaderValue = typeof http.validateHeaderValue === "function" ? http.validateHeaderValue : (name, value) => {
      if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const error2 = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(error2, "code", { value: "ERR_INVALID_CHAR" });
        throw error2;
      }
    };
    Headers = class extends URLSearchParams {
      constructor(init2) {
        let result = [];
        if (init2 instanceof Headers) {
          const raw = init2.raw();
          for (const [name, values] of Object.entries(raw)) {
            result.push(...values.map((value) => [name, value]));
          }
        } else if (init2 == null)
          ;
        else if (typeof init2 === "object" && !types.isBoxedPrimitive(init2)) {
          const method = init2[Symbol.iterator];
          if (method == null) {
            result.push(...Object.entries(init2));
          } else {
            if (typeof method !== "function") {
              throw new TypeError("Header pairs must be iterable");
            }
            result = [...init2].map((pair) => {
              if (typeof pair !== "object" || types.isBoxedPrimitive(pair)) {
                throw new TypeError("Each header pair must be an iterable object");
              }
              return [...pair];
            }).map((pair) => {
              if (pair.length !== 2) {
                throw new TypeError("Each header pair must be a name/value tuple");
              }
              return [...pair];
            });
          }
        } else {
          throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
        }
        result = result.length > 0 ? result.map(([name, value]) => {
          validateHeaderName(name);
          validateHeaderValue(name, String(value));
          return [String(name).toLowerCase(), String(value)];
        }) : void 0;
        super(result);
        return new Proxy(this, {
          get(target, p, receiver) {
            switch (p) {
              case "append":
              case "set":
                return (name, value) => {
                  validateHeaderName(name);
                  validateHeaderValue(name, String(value));
                  return URLSearchParams.prototype[p].call(target, String(name).toLowerCase(), String(value));
                };
              case "delete":
              case "has":
              case "getAll":
                return (name) => {
                  validateHeaderName(name);
                  return URLSearchParams.prototype[p].call(target, String(name).toLowerCase());
                };
              case "keys":
                return () => {
                  target.sort();
                  return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                };
              default:
                return Reflect.get(target, p, receiver);
            }
          }
        });
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
      toString() {
        return Object.prototype.toString.call(this);
      }
      get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
          return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
          value = value.toLowerCase();
        }
        return value;
      }
      forEach(callback, thisArg = void 0) {
        for (const name of this.keys()) {
          Reflect.apply(callback, thisArg, [this.get(name), name, this]);
        }
      }
      *values() {
        for (const name of this.keys()) {
          yield this.get(name);
        }
      }
      *entries() {
        for (const name of this.keys()) {
          yield [name, this.get(name)];
        }
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      raw() {
        return [...this.keys()].reduce((result, key) => {
          result[key] = this.getAll(key);
          return result;
        }, {});
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key) => {
          const values = this.getAll(key);
          if (key === "host") {
            result[key] = values[0];
          } else {
            result[key] = values.length > 1 ? values : values[0];
          }
          return result;
        }, {});
      }
    };
    Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
      result[property] = { enumerable: true };
      return result;
    }, {}));
    redirectStatus = new Set([301, 302, 303, 307, 308]);
    isRedirect = (code) => {
      return redirectStatus.has(code);
    };
    INTERNALS$1 = Symbol("Response internals");
    Response = class extends Body {
      constructor(body = null, options2 = {}) {
        super(body, options2);
        const status = options2.status != null ? options2.status : 200;
        const headers = new Headers(options2.headers);
        if (body !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(body);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        this[INTERNALS$1] = {
          type: "default",
          url: options2.url,
          status,
          statusText: options2.statusText || "",
          headers,
          counter: options2.counter,
          highWaterMark: options2.highWaterMark
        };
      }
      get type() {
        return this[INTERNALS$1].type;
      }
      get url() {
        return this[INTERNALS$1].url || "";
      }
      get status() {
        return this[INTERNALS$1].status;
      }
      get ok() {
        return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
      }
      get redirected() {
        return this[INTERNALS$1].counter > 0;
      }
      get statusText() {
        return this[INTERNALS$1].statusText;
      }
      get headers() {
        return this[INTERNALS$1].headers;
      }
      get highWaterMark() {
        return this[INTERNALS$1].highWaterMark;
      }
      clone() {
        return new Response(clone(this, this.highWaterMark), {
          type: this.type,
          url: this.url,
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          ok: this.ok,
          redirected: this.redirected,
          size: this.size
        });
      }
      static redirect(url, status = 302) {
        if (!isRedirect(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new Response(null, {
          headers: {
            location: new URL(url).toString()
          },
          status
        });
      }
      static error() {
        const response = new Response(null, { status: 0, statusText: "" });
        response[INTERNALS$1].type = "error";
        return response;
      }
      get [Symbol.toStringTag]() {
        return "Response";
      }
    };
    Object.defineProperties(Response.prototype, {
      type: { enumerable: true },
      url: { enumerable: true },
      status: { enumerable: true },
      ok: { enumerable: true },
      redirected: { enumerable: true },
      statusText: { enumerable: true },
      headers: { enumerable: true },
      clone: { enumerable: true }
    });
    getSearch = (parsedURL) => {
      if (parsedURL.search) {
        return parsedURL.search;
      }
      const lastOffset = parsedURL.href.length - 1;
      const hash2 = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
      return parsedURL.href[lastOffset - hash2.length] === "?" ? "?" : "";
    };
    INTERNALS = Symbol("Request internals");
    isRequest = (object) => {
      return typeof object === "object" && typeof object[INTERNALS] === "object";
    };
    Request = class extends Body {
      constructor(input, init2 = {}) {
        let parsedURL;
        if (isRequest(input)) {
          parsedURL = new URL(input.url);
        } else {
          parsedURL = new URL(input);
          input = {};
        }
        let method = init2.method || input.method || "GET";
        method = method.toUpperCase();
        if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
          throw new TypeError("Request with GET/HEAD method cannot have body");
        }
        const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
        super(inputBody, {
          size: init2.size || input.size || 0
        });
        const headers = new Headers(init2.headers || input.headers || {});
        if (inputBody !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(inputBody, this);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        let signal = isRequest(input) ? input.signal : null;
        if ("signal" in init2) {
          signal = init2.signal;
        }
        if (signal != null && !isAbortSignal(signal)) {
          throw new TypeError("Expected signal to be an instanceof AbortSignal or EventTarget");
        }
        this[INTERNALS] = {
          method,
          redirect: init2.redirect || input.redirect || "follow",
          headers,
          parsedURL,
          signal
        };
        this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
        this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
        this.counter = init2.counter || input.counter || 0;
        this.agent = init2.agent || input.agent;
        this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
        this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
      }
      get method() {
        return this[INTERNALS].method;
      }
      get url() {
        return format(this[INTERNALS].parsedURL);
      }
      get headers() {
        return this[INTERNALS].headers;
      }
      get redirect() {
        return this[INTERNALS].redirect;
      }
      get signal() {
        return this[INTERNALS].signal;
      }
      clone() {
        return new Request(this);
      }
      get [Symbol.toStringTag]() {
        return "Request";
      }
    };
    Object.defineProperties(Request.prototype, {
      method: { enumerable: true },
      url: { enumerable: true },
      headers: { enumerable: true },
      redirect: { enumerable: true },
      clone: { enumerable: true },
      signal: { enumerable: true }
    });
    getNodeRequestOptions = (request) => {
      const { parsedURL } = request[INTERNALS];
      const headers = new Headers(request[INTERNALS].headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "*/*");
      }
      let contentLengthValue = null;
      if (request.body === null && /^(post|put)$/i.test(request.method)) {
        contentLengthValue = "0";
      }
      if (request.body !== null) {
        const totalBytes = getTotalBytes(request);
        if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
          contentLengthValue = String(totalBytes);
        }
      }
      if (contentLengthValue) {
        headers.set("Content-Length", contentLengthValue);
      }
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "node-fetch");
      }
      if (request.compress && !headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,br");
      }
      let { agent } = request;
      if (typeof agent === "function") {
        agent = agent(parsedURL);
      }
      if (!headers.has("Connection") && !agent) {
        headers.set("Connection", "close");
      }
      const search = getSearch(parsedURL);
      const requestOptions = {
        path: parsedURL.pathname + search,
        pathname: parsedURL.pathname,
        hostname: parsedURL.hostname,
        protocol: parsedURL.protocol,
        port: parsedURL.port,
        hash: parsedURL.hash,
        search: parsedURL.search,
        query: parsedURL.query,
        href: parsedURL.href,
        method: request.method,
        headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
        insecureHTTPParser: request.insecureHTTPParser,
        agent
      };
      return requestOptions;
    };
    AbortError = class extends FetchBaseError {
      constructor(message, type = "aborted") {
        super(message, type);
      }
    };
    supportedSchemas = new Set(["data:", "http:", "https:"]);
  }
});

// node_modules/@sveltejs/adapter-node/files/shims.js
import { createRequire } from "module";
var init_shims = __esm({
  "node_modules/@sveltejs/adapter-node/files/shims.js"() {
    init_install_fetch();
    Object.defineProperty(globalThis, "require", {
      enumerable: true,
      value: createRequire(import.meta.url)
    });
  }
});

// node_modules/@sveltejs/kit/dist/chunks/url.js
function get_single_valued_header(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return void 0;
    }
    if (value.length > 1) {
      throw new Error(`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`);
    }
    return value[0];
  }
  return value;
}
function resolve(base2, path) {
  if (scheme.test(path))
    return path;
  const base_match = absolute.exec(base2);
  const path_match = absolute.exec(path);
  if (!base_match) {
    throw new Error(`bad base path: "${base2}"`);
  }
  const baseparts = path_match ? [] : base2.slice(base_match[0].length).split("/");
  const pathparts = path_match ? path.slice(path_match[0].length).split("/") : path.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  const prefix = path_match && path_match[0] || base_match && base_match[0] || "";
  return `${prefix}${baseparts.join("/")}`;
}
function is_root_relative(path) {
  return path[0] === "/" && path[1] !== "/";
}
var absolute, scheme;
var init_url = __esm({
  "node_modules/@sveltejs/kit/dist/chunks/url.js"() {
    init_shims();
    absolute = /^([a-z]+:)?\/?\//;
    scheme = /^[a-z]+:/;
  }
});

// node_modules/@sveltejs/kit/dist/chunks/error.js
function coalesce_to_error(err) {
  return err instanceof Error || err && err.name && err.message ? err : new Error(JSON.stringify(err));
}
var init_error = __esm({
  "node_modules/@sveltejs/kit/dist/chunks/error.js"() {
    init_shims();
  }
});

// node_modules/@sveltejs/kit/dist/ssr.js
function lowercase_keys(obj) {
  const clone3 = {};
  for (const key in obj) {
    clone3[key.toLowerCase()] = obj[key];
  }
  return clone3;
}
function error(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
function is_string(s2) {
  return typeof s2 === "string" || s2 instanceof String;
}
function is_content_type_textual(content_type) {
  if (!content_type)
    return true;
  const [type] = content_type.split(";");
  return type === "text/plain" || type === "application/json" || type === "application/x-www-form-urlencoded" || type === "multipart/form-data";
}
async function render_endpoint(request, route, match) {
  const mod = await route.load();
  const handler = mod[request.method.toLowerCase().replace("delete", "del")];
  if (!handler) {
    return;
  }
  const params = route.params(match);
  const response = await handler(__spreadProps(__spreadValues({}, request), { params }));
  const preface = `Invalid response from route ${request.path}`;
  if (!response) {
    return;
  }
  if (typeof response !== "object") {
    return error(`${preface}: expected an object, got ${typeof response}`);
  }
  let { status = 200, body, headers = {} } = response;
  headers = lowercase_keys(headers);
  const type = get_single_valued_header(headers, "content-type");
  const is_type_textual = is_content_type_textual(type);
  if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
    return error(`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`);
  }
  let normalized_body;
  if ((typeof body === "object" || typeof body === "undefined") && !(body instanceof Uint8Array) && (!type || type.startsWith("application/json"))) {
    headers = __spreadProps(__spreadValues({}, headers), { "content-type": "application/json; charset=utf-8" });
    normalized_body = JSON.stringify(typeof body === "undefined" ? {} : body);
  } else {
    normalized_body = body;
  }
  return { status, body: normalized_body, headers };
}
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a2) {
            var k = _a2[0], v = _a2[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped) {
      result += escaped[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
function writable(value, start = noop) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
function escape_json_string_in_html(str) {
  return escape(str, escape_json_string_in_html_dict, (code) => `\\u${code.toString(16).toUpperCase()}`);
}
function escape_html_attr(str) {
  return '"' + escape(str, escape_html_attr_dict, (code) => `&#${code};`) + '"';
}
function escape(str, dict, unicode_encoder) {
  let result = "";
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char in dict) {
      result += dict[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += unicode_encoder(code);
      }
    } else {
      result += char;
    }
  }
  return result;
}
async function render_response({
  branch,
  options: options2,
  $session,
  page_config,
  status,
  error: error2,
  page
}) {
  const css5 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options2.get_stack(error2);
  }
  if (page_config.ssr) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css5.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css5).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
    init2 += options2.service_worker ? '<script async custom-element="amp-install-serviceworker" src="https://cdn.ampproject.org/v0/amp-install-serviceworker-0.1.js"><\/script>' : "";
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page && page.host ? s$1(page.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${(branch || []).map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page && page.host ? s$1(page.host) : "location.host"}, // TODO this is redundant
						path: ${page && page.path ? try_serialize(page.path, (error3) => {
      throw new Error(`Failed to serialize page.path: ${error3.message}`);
    }) : null},
						query: new URLSearchParams(${page && page.query ? s$1(page.query.toString()) : ""}),
						params: ${page && page.params ? try_serialize(page.params, (error3) => {
      throw new Error(`Failed to serialize page.params: ${error3.message}`);
    }) : null}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += options2.amp ? `<amp-install-serviceworker src="${options2.service_worker}" layout="nodisplay"></amp-install-serviceworker>` : `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url=${escape_html_attr(url)}`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n	")}
		`;
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(coalesce_to_error(err));
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const { name, message, stack } = error2;
    serialized = try_serialize(__spreadProps(__spreadValues({}, error2), { name, message, stack }));
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  const has_error_status = loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
  if (loaded.error || has_error_status) {
    const status = loaded.status;
    if (!loaded.error && has_error_status) {
      return {
        status: status || 500,
        error: new Error()
      };
    }
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error2 };
    }
    return { status, error: error2 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  if (loaded.context) {
    throw new Error('You are returning "context" from a load function. "context" was renamed to "stuff", please adjust your code accordingly.');
  }
  return loaded;
}
async function load_node({
  request,
  options: options2,
  state,
  route,
  page,
  node,
  $session,
  stuff,
  prerender_enabled,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const { module } = node;
  let uses_credentials = false;
  const fetched = [];
  let set_cookie_headers = [];
  let loaded;
  const page_proxy = new Proxy(page, {
    get: (target, prop, receiver) => {
      if (prop === "query" && prerender_enabled) {
        throw new Error("Cannot access query on a page with prerendering enabled");
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  if (module.load) {
    const load_input = {
      page: page_proxy,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = __spreadValues({
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity
          }, opts);
        }
        const resolved = resolve(request.path, url.split("?")[0]);
        let response;
        const prefix = options2.paths.assets || options2.paths.base;
        const filename = (resolved.startsWith(prefix) ? resolved.slice(prefix.length) : resolved).slice(1);
        const filename_html = `${filename}/index.html`;
        const asset = options2.manifest.assets.find((d2) => d2.file === filename || d2.file === filename_html);
        if (asset) {
          response = options2.read ? new Response(options2.read(asset.file), {
            headers: asset.type ? { "content-type": asset.type } : {}
          }) : await fetch(`http://${page.host}/${asset.file}`, opts);
        } else if (is_root_relative(resolved)) {
          const relative = resolved;
          const headers = __spreadValues({}, opts.headers);
          if (opts.credentials !== "omit") {
            uses_credentials = true;
            headers.cookie = request.headers.cookie;
            if (!headers.authorization) {
              headers.authorization = request.headers.authorization;
            }
          }
          if (opts.body && typeof opts.body !== "string") {
            throw new Error("Request body must be a string");
          }
          const search = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const rendered = await respond({
            host: request.host,
            method: opts.method || "GET",
            headers,
            path: relative,
            rawBody: opts.body == null ? null : new TextEncoder().encode(opts.body),
            query: new URLSearchParams(search)
          }, options2, {
            fetched: url,
            initiator: route
          });
          if (rendered) {
            if (state.prerender) {
              state.prerender.dependencies.set(relative, rendered);
            }
            response = new Response(rendered.body, {
              status: rendered.status,
              headers: rendered.headers
            });
          }
        } else {
          if (resolved.startsWith("//")) {
            throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
          }
          if (typeof request.host !== "undefined") {
            const { hostname: fetch_hostname } = new URL(url);
            const [server_hostname] = request.host.split(":");
            if (`.${fetch_hostname}`.endsWith(`.${server_hostname}`) && opts.credentials !== "omit") {
              uses_credentials = true;
              opts.headers = __spreadProps(__spreadValues({}, opts.headers), {
                cookie: request.headers.cookie
              });
            }
          }
          const external_request = new Request(url, opts);
          response = await options2.hooks.externalFetch.call(null, external_request);
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, _receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 === "set-cookie") {
                    set_cookie_headers = set_cookie_headers.concat(value);
                  } else if (key2 !== "etag") {
                    headers[key2] = value;
                  }
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":"${escape_json_string_in_html(body)}"}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      stuff: __spreadValues({}, stuff)
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  if (!loaded) {
    throw new Error(`${node.entry} - load must return a value except for page fall through`);
  }
  return {
    node,
    loaded: normalize(loaded),
    stuff: loaded.stuff || stuff,
    fetched,
    set_cookie_headers,
    uses_credentials
  };
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error2 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page,
    node: default_layout,
    $session,
    stuff: {},
    prerender_enabled: is_prerender_enabled(options2, default_error, state),
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page,
      node: default_error,
      $session,
      stuff: loaded ? loaded.stuff : {},
      prerender_enabled: is_prerender_enabled(options2, default_error, state),
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error2,
      branch,
      page
    });
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
function is_prerender_enabled(options2, node, state) {
  return options2.prerender && (!!node.module.prerender || !!state.prerender && state.prerender.all);
}
async function respond$1(opts) {
  const { request, options: options2, state, $session, route } = opts;
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id ? options2.load_component(id) : void 0));
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  let page_config = get_page_config(leaf, options2);
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {}
    };
  }
  let branch = [];
  let status = 200;
  let error2;
  let set_cookie_headers = [];
  ssr:
    if (page_config.ssr) {
      let stuff = {};
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node(__spreadProps(__spreadValues({}, opts), {
              node,
              stuff,
              prerender_enabled: is_prerender_enabled(options2, node, state),
              is_leaf: i === nodes.length - 1,
              is_error: false
            }));
            if (!loaded)
              return;
            set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);
            if (loaded.loaded.redirect) {
              return with_cookies({
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              }, set_cookie_headers);
            }
            if (loaded.loaded.error) {
              ({ status, error: error2 } = loaded.loaded);
            }
          } catch (err) {
            const e = coalesce_to_error(err);
            options2.handle_error(e, request);
            status = 500;
            error2 = e;
          }
          if (loaded && !error2) {
            branch.push(loaded);
          }
          if (error2) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  const error_loaded = await load_node(__spreadProps(__spreadValues({}, opts), {
                    node: error_node,
                    stuff: node_loaded.stuff,
                    prerender_enabled: is_prerender_enabled(options2, error_node, state),
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  }));
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  page_config = get_page_config(error_node.module, options2);
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (err) {
                  const e = coalesce_to_error(err);
                  options2.handle_error(e, request);
                  continue;
                }
              }
            }
            return with_cookies(await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error2
            }), set_cookie_headers);
          }
        }
        if (loaded && loaded.loaded.stuff) {
          stuff = __spreadValues(__spreadValues({}, stuff), loaded.loaded.stuff);
        }
      }
    }
  try {
    return with_cookies(await render_response(__spreadProps(__spreadValues({}, opts), {
      page_config,
      status,
      error: error2,
      branch: branch.filter(Boolean)
    })), set_cookie_headers);
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return with_cookies(await respond_with_error(__spreadProps(__spreadValues({}, opts), {
      status: 500,
      error: error3
    })), set_cookie_headers);
  }
}
function get_page_config(leaf, options2) {
  return {
    ssr: "ssr" in leaf ? !!leaf.ssr : options2.ssr,
    router: "router" in leaf ? !!leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? !!leaf.hydrate : options2.hydrate
  };
}
function with_cookies(response, set_cookie_headers) {
  if (set_cookie_headers.length) {
    response.headers["set-cookie"] = set_cookie_headers;
  }
  return response;
}
async function render_page(request, route, match, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const params = route.params(match);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  const $session = await options2.hooks.getSession(request);
  const response = await respond$1({
    request,
    options: options2,
    state,
    $session,
    route,
    page
  });
  if (response) {
    return response;
  }
  if (state.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${state.fetched}`
    };
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        (map.get(key) || []).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const content_type = headers["content-type"];
  const [type, ...directives] = content_type ? content_type.split(/;\s*/) : [];
  const text = () => new TextDecoder(headers["content-encoding"] || "utf-8").decode(raw);
  switch (type) {
    case "text/plain":
      return text();
    case "application/json":
      return JSON.parse(text());
    case "application/x-www-form-urlencoded":
      return get_urlencoded(text());
    case "multipart/form-data": {
      const boundary = directives.find((directive) => directive.startsWith("boundary="));
      if (!boundary)
        throw new Error("Missing boundary");
      return get_multipart(text(), boundary.slice("boundary=".length));
    }
    default:
      return raw;
  }
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    throw new Error("Malformed form data");
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    if (!match) {
      throw new Error("Malformed form data");
    }
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    const headers = {};
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      headers[name] = value;
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          throw new Error("Malformed form data");
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      throw new Error("Malformed form data");
    append(key, body);
  });
  return data;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !(incoming.path.split("/").pop() || "").includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: options2.paths.base + path + (q ? `?${q}` : "")
        }
      };
    }
  }
  const headers = lowercase_keys(incoming.headers);
  const request = __spreadProps(__spreadValues({}, incoming), {
    headers,
    body: parse_body(incoming.rawBody, headers),
    params: {},
    locals: {}
  });
  try {
    return await options2.hooks.handle({
      request,
      resolve: async (request2) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request2),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            branch: []
          });
        }
        const decoded = decodeURI(request2.path);
        for (const route of options2.manifest.routes) {
          const match = route.pattern.exec(decoded);
          if (!match)
            continue;
          const response = route.type === "endpoint" ? await render_endpoint(request2, route, match) : await render_page(request2, route, match, options2, state);
          if (response) {
            if (response.status === 200) {
              const cache_control = get_single_valued_header(response.headers, "cache-control");
              if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
                let if_none_match_value = request2.headers["if-none-match"];
                if (if_none_match_value == null ? void 0 : if_none_match_value.startsWith('W/"')) {
                  if_none_match_value = if_none_match_value.substring(2);
                }
                const etag = `"${hash(response.body || "")}"`;
                if (if_none_match_value === etag) {
                  return {
                    status: 304,
                    headers: {}
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        const $session = await options2.hooks.getSession(request2);
        return await respond_with_error({
          request: request2,
          options: options2,
          state,
          $session,
          status: 404,
          error: new Error(`Not found: ${request2.path}`)
        });
      }
    });
  } catch (err) {
    const e = coalesce_to_error(err);
    options2.handle_error(e, request);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}
var chars, unsafeChars, reserved, escaped, objectProtoOwnPropertyNames, subscriber_queue, escape_json_string_in_html_dict, escape_html_attr_dict, s$1, s, _map, ReadOnlyFormData;
var init_ssr = __esm({
  "node_modules/@sveltejs/kit/dist/ssr.js"() {
    init_shims();
    init_url();
    init_error();
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
    unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
    reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
    escaped = {
      "<": "\\u003C",
      ">": "\\u003E",
      "/": "\\u002F",
      "\\": "\\\\",
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "	": "\\t",
      "\0": "\\0",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
    Promise.resolve();
    subscriber_queue = [];
    escape_json_string_in_html_dict = {
      '"': '\\"',
      "<": "\\u003C",
      ">": "\\u003E",
      "/": "\\u002F",
      "\\": "\\\\",
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "	": "\\t",
      "\0": "\\0",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    escape_html_attr_dict = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    };
    s$1 = JSON.stringify;
    s = JSON.stringify;
    ReadOnlyFormData = class {
      constructor(map) {
        __privateAdd(this, _map, void 0);
        __privateSet(this, _map, map);
      }
      get(key) {
        const value = __privateGet(this, _map).get(key);
        return value && value[0];
      }
      getAll(key) {
        return __privateGet(this, _map).get(key);
      }
      has(key) {
        return __privateGet(this, _map).has(key);
      }
      *[Symbol.iterator]() {
        for (const [key, value] of __privateGet(this, _map)) {
          for (let i = 0; i < value.length; i += 1) {
            yield [key, value[i]];
          }
        }
      }
      *entries() {
        for (const [key, value] of __privateGet(this, _map)) {
          for (let i = 0; i < value.length; i += 1) {
            yield [key, value[i]];
          }
        }
      }
      *keys() {
        for (const [key] of __privateGet(this, _map))
          yield key;
      }
      *values() {
        for (const [, value] of __privateGet(this, _map)) {
          for (let i = 0; i < value.length; i += 1) {
            yield value[i];
          }
        }
      }
    };
    _map = new WeakMap();
  }
});

// .svelte-kit/output/server/chunks/posts-ecb4c61f.js
var posts_ecb4c61f_exports = {};
__export(posts_ecb4c61f_exports, {
  get: () => get
});
async function get() {
  const res = await fetch("https://api.merrybrew.app/posts");
  const data = await res.json();
  return { body: data };
}
var init_posts_ecb4c61f = __esm({
  ".svelte-kit/output/server/chunks/posts-ecb4c61f.js"() {
    init_shims();
  }
});

// .svelte-kit/output/server/chunks/user-b0829f99.js
function writable2(value, start = noop2) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal2(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue2.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue2.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue2.length; i += 2) {
            subscriber_queue2[i][0](subscriber_queue2[i + 1]);
          }
          subscriber_queue2.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop2) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop2;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
}
var subscriber_queue2, user;
var init_user_b0829f99 = __esm({
  ".svelte-kit/output/server/chunks/user-b0829f99.js"() {
    init_shims();
    init_app_d23b9461();
    subscriber_queue2 = [];
    user = writable2(null);
  }
});

// .svelte-kit/output/server/chunks/__layout-1d839b61.js
var layout_1d839b61_exports = {};
__export(layout_1d839b61_exports, {
  default: () => _layout
});
import "@fortawesome/free-solid-svg-icons";
import "cookie";
import "@lukeed/uuid";
var _layout;
var init_layout_1d839b61 = __esm({
  ".svelte-kit/output/server/chunks/__layout-1d839b61.js"() {
    init_shims();
    init_app_d23b9461();
    init_user_b0829f99();
    init_ssr();
    _layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $$unsubscribe_userStore;
      $$unsubscribe_userStore = subscribe(user, (value) => value);
      $$unsubscribe_userStore();
      return `${``}`;
    });
  }
});

// .svelte-kit/output/server/chunks/__error-201546fd.js
var error_201546fd_exports = {};
__export(error_201546fd_exports, {
  default: () => _error,
  load: () => load
});
import "cookie";
import "@lukeed/uuid";
var load, _error;
var init_error_201546fd = __esm({
  ".svelte-kit/output/server/chunks/__error-201546fd.js"() {
    init_shims();
    init_app_d23b9461();
    init_ssr();
    load = ({ error: error2, status }) => {
      return { props: { error: error2, status } };
    };
    _error = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { error: error2 } = $$props;
      let { status } = $$props;
      if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
        $$bindings.error(error2);
      if ($$props.status === void 0 && $$bindings.status && status !== void 0)
        $$bindings.status(status);
      return `<div class="${"fixed w-full h-full grid place-items-center"}"><section class="${"p-8 border-gray-500 rounded"}"><h1 class="${"text-center text-4xl font-mono-mt-4"}">${escape2(status)}</h1>
		<p class="${"text-center"}">${escape2(error2.message)}</p></section></div>`;
    });
  }
});

// .svelte-kit/output/server/chunks/fa-6986f2e9.js
function joinCss(obj, separator = ";") {
  let texts;
  if (Array.isArray(obj)) {
    texts = obj.filter((text) => text);
  } else {
    texts = [];
    for (const prop in obj) {
      if (obj[prop]) {
        texts.push(`${prop}:${obj[prop]}`);
      }
    }
  }
  return texts.join(separator);
}
function getStyles(style, size, pull, fw) {
  let float;
  let width;
  const height2 = "1em";
  let lineHeight;
  let fontSize;
  let textAlign;
  let verticalAlign = "-.125em";
  const overflow = "visible";
  if (fw) {
    textAlign = "center";
    width = "1.25em";
  }
  if (pull) {
    float = pull;
  }
  if (size) {
    if (size == "lg") {
      fontSize = "1.33333em";
      lineHeight = ".75em";
      verticalAlign = "-.225em";
    } else if (size == "xs") {
      fontSize = ".75em";
    } else if (size == "sm") {
      fontSize = ".875em";
    } else {
      fontSize = size.replace("x", "em");
    }
  }
  return joinCss([
    joinCss({
      float,
      width,
      height: height2,
      "line-height": lineHeight,
      "font-size": fontSize,
      "text-align": textAlign,
      "vertical-align": verticalAlign,
      "transform-origin": "center",
      overflow
    }),
    style
  ]);
}
function getTransform(scale2, translateX, translateY, rotate, flip, translateTimes = 1, translateUnit = "", rotateUnit = "") {
  let flipX = 1;
  let flipY = 1;
  if (flip) {
    if (flip == "horizontal") {
      flipX = -1;
    } else if (flip == "vertical") {
      flipY = -1;
    } else {
      flipX = flipY = -1;
    }
  }
  return joinCss([
    `translate(${parseNumber(translateX) * translateTimes}${translateUnit},${parseNumber(translateY) * translateTimes}${translateUnit})`,
    `scale(${flipX * parseNumber(scale2)},${flipY * parseNumber(scale2)})`,
    rotate && `rotate(${rotate}${rotateUnit})`
  ], " ");
}
var parseNumber, css, Fa;
var init_fa_6986f2e9 = __esm({
  ".svelte-kit/output/server/chunks/fa-6986f2e9.js"() {
    init_shims();
    init_app_d23b9461();
    parseNumber = parseFloat;
    css = {
      code: ".spin.svelte-1v74nst{-webkit-animation:svelte-1v74nst-spin 2s 0s infinite linear;animation:svelte-1v74nst-spin 2s 0s infinite linear}.pulse.svelte-1v74nst{-webkit-animation:svelte-1v74nst-spin 1s infinite steps(8);animation:svelte-1v74nst-spin 1s infinite steps(8)}@-webkit-keyframes svelte-1v74nst-spin{0%{-webkit-transform:rotate(0deg);transform:rotate(0deg)}100%{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}@keyframes svelte-1v74nst-spin{0%{-webkit-transform:rotate(0deg);transform:rotate(0deg)}100%{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}",
      map: null
    };
    Fa = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { class: clazz = "" } = $$props;
      let { id = "" } = $$props;
      let { style = "" } = $$props;
      let { icon } = $$props;
      let { size = "" } = $$props;
      let { color = "" } = $$props;
      let { fw = false } = $$props;
      let { pull = "" } = $$props;
      let { scale: scale2 = 1 } = $$props;
      let { translateX = 0 } = $$props;
      let { translateY = 0 } = $$props;
      let { rotate = "" } = $$props;
      let { flip = false } = $$props;
      let { spin = false } = $$props;
      let { pulse = false } = $$props;
      let { primaryColor = "" } = $$props;
      let { secondaryColor = "" } = $$props;
      let { primaryOpacity = 1 } = $$props;
      let { secondaryOpacity = 0.4 } = $$props;
      let { swapOpacity = false } = $$props;
      let i;
      let c;
      let s2;
      let transform2;
      if ($$props.class === void 0 && $$bindings.class && clazz !== void 0)
        $$bindings.class(clazz);
      if ($$props.id === void 0 && $$bindings.id && id !== void 0)
        $$bindings.id(id);
      if ($$props.style === void 0 && $$bindings.style && style !== void 0)
        $$bindings.style(style);
      if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
        $$bindings.icon(icon);
      if ($$props.size === void 0 && $$bindings.size && size !== void 0)
        $$bindings.size(size);
      if ($$props.color === void 0 && $$bindings.color && color !== void 0)
        $$bindings.color(color);
      if ($$props.fw === void 0 && $$bindings.fw && fw !== void 0)
        $$bindings.fw(fw);
      if ($$props.pull === void 0 && $$bindings.pull && pull !== void 0)
        $$bindings.pull(pull);
      if ($$props.scale === void 0 && $$bindings.scale && scale2 !== void 0)
        $$bindings.scale(scale2);
      if ($$props.translateX === void 0 && $$bindings.translateX && translateX !== void 0)
        $$bindings.translateX(translateX);
      if ($$props.translateY === void 0 && $$bindings.translateY && translateY !== void 0)
        $$bindings.translateY(translateY);
      if ($$props.rotate === void 0 && $$bindings.rotate && rotate !== void 0)
        $$bindings.rotate(rotate);
      if ($$props.flip === void 0 && $$bindings.flip && flip !== void 0)
        $$bindings.flip(flip);
      if ($$props.spin === void 0 && $$bindings.spin && spin !== void 0)
        $$bindings.spin(spin);
      if ($$props.pulse === void 0 && $$bindings.pulse && pulse !== void 0)
        $$bindings.pulse(pulse);
      if ($$props.primaryColor === void 0 && $$bindings.primaryColor && primaryColor !== void 0)
        $$bindings.primaryColor(primaryColor);
      if ($$props.secondaryColor === void 0 && $$bindings.secondaryColor && secondaryColor !== void 0)
        $$bindings.secondaryColor(secondaryColor);
      if ($$props.primaryOpacity === void 0 && $$bindings.primaryOpacity && primaryOpacity !== void 0)
        $$bindings.primaryOpacity(primaryOpacity);
      if ($$props.secondaryOpacity === void 0 && $$bindings.secondaryOpacity && secondaryOpacity !== void 0)
        $$bindings.secondaryOpacity(secondaryOpacity);
      if ($$props.swapOpacity === void 0 && $$bindings.swapOpacity && swapOpacity !== void 0)
        $$bindings.swapOpacity(swapOpacity);
      $$result.css.add(css);
      i = icon && icon.icon || [0, 0, "", [], ""];
      c = joinCss([clazz, "svelte-fa", spin && "spin", pulse && "pulse"], " ");
      s2 = getStyles(style, size, pull, fw);
      transform2 = getTransform(scale2, translateX, translateY, rotate, flip, 512);
      return `${i[4] ? `<svg${add_attribute("id", id, 0)} class="${escape2(null_to_empty(c)) + " svelte-1v74nst"}"${add_attribute("style", s2, 0)}${add_attribute("viewBox", `0 0 ${i[0]} ${i[1]}`, 0)} aria-hidden="${"true"}" role="${"img"}" xmlns="${"http://www.w3.org/2000/svg"}"><g${add_attribute("transform", `translate(${i[0] / 2} ${i[1] / 2})`, 0)}${add_attribute("transform-origin", `${i[0] / 4} 0`, 0)}><g${add_attribute("transform", transform2, 0)}>${typeof i[4] == "string" ? `<path${add_attribute("d", i[4], 0)}${add_attribute("fill", color || primaryColor || "currentColor", 0)}${add_attribute("transform", `translate(${i[0] / -2} ${i[1] / -2})`, 0)}></path>` : `<path${add_attribute("d", i[4][0], 0)}${add_attribute("fill", secondaryColor || color || "currentColor", 0)}${add_attribute("fill-opacity", swapOpacity != false ? primaryOpacity : secondaryOpacity, 0)}${add_attribute("transform", `translate(${i[0] / -2} ${i[1] / -2})`, 0)}></path>
          <path${add_attribute("d", i[4][1], 0)}${add_attribute("fill", primaryColor || color || "currentColor", 0)}${add_attribute("fill-opacity", swapOpacity != false ? secondaryOpacity : primaryOpacity, 0)}${add_attribute("transform", `translate(${i[0] / -2} ${i[1] / -2})`, 0)}></path>`}</g></g></svg>` : ``}`;
    });
  }
});

// .svelte-kit/output/server/chunks/index-d06c234b.js
var index_d06c234b_exports = {};
__export(index_d06c234b_exports, {
  default: () => Routes,
  load: () => load2
});
import { faPlusCircle, faWineBottle, faHourglassHalf, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "cookie";
import "@lukeed/uuid";
function guard(name) {
  return () => {
    throw new Error(`Cannot call ${name}(...) on the server`);
  };
}
var goto, load2, Routes;
var init_index_d06c234b = __esm({
  ".svelte-kit/output/server/chunks/index-d06c234b.js"() {
    init_shims();
    init_app_d23b9461();
    init_fa_6986f2e9();
    init_user_b0829f99();
    init_ssr();
    goto = guard("goto");
    load2 = async ({ fetch: fetch2 }) => {
      const res = await fetch2("/posts");
      const data = await res.json();
      return { props: { posts: data } };
    };
    Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $user, $$unsubscribe_user;
      $$unsubscribe_user = subscribe(user, (value) => $user = value);
      let { posts } = $$props;
      if ($$props.posts === void 0 && $$bindings.posts && posts !== void 0)
        $$bindings.posts(posts);
      $$unsubscribe_user();
      return `${!$user ? `${escape2(goto("/login/"))}` : ``}


<div class="${"flex flex-col h-screen max-w-4xl"}"><div class="${"flex-grow"}"><div class="${"my-4"}"><h1 class="${"text-center font-serif text-4xl font-bold "}">My brew projects</h1></div>
		
		<div class="${"container mt-2"}">${each(posts, (post) => `${$user && post.author.id === $user.id ? `<div class="${"p-4 container rounded-md shadow-lg space-x-2 hover:bg-gray-200 cursor-pointer"}"><div class="${"flex justify-left"}"><p class="${"font-bold font-serif text-lg"}">${escape2(post.title)}</p>
						<p class="${"ml-5 mx-1 my-2 mt-2"}">${post.values["finished"] ? `${validate_component(Fa, "Fa").$$render($$result, {
        icon: faWineBottle,
        translateY: "0",
        size: "sm"
      }, {}, {})}` : `${validate_component(Fa, "Fa").$$render($$result, {
        icon: faHourglassHalf,
        translateY: "0",
        size: "sm",
        spin: true
      }, {}, {})}`}</p>
						<p class="${"mx-0 my-1 mt-1"}">${post.values["public"] ? `${validate_component(Fa, "Fa").$$render($$result, {
        icon: faEye,
        translateY: "0.2",
        size: "sm"
      }, {}, {})}` : `${validate_component(Fa, "Fa").$$render($$result, {
        icon: faEyeSlash,
        translateY: "0.2",
        size: "sm"
      }, {}, {})}`}
						</p></div>
					${post.values["description"] ? `<p class="${"ml-1 italic font-serif text-md"}">${escape2(post.values["description"])}</p>` : ``}
					<p class="${"ml-1 mt-3 italic text-xs"}">Last updated: ${escape2(post.updated_at.substring(0, 10))}</p>
				</div>` : ``}`)}</div></div>
	

	<div class="${"sticky grid justify-items-end absolute bottom-0 "}"><div class="${"pb-14"}"><a href="${"/new"}" alt="${"Create"}">${validate_component(Fa, "Fa").$$render($$result, {
        icon: faPlusCircle,
        color: "#333333",
        translateY: "0",
        translateX: "-0.1",
        size: "4x"
      }, {}, {})}</a></div></div></div>`;
    });
  }
});

// .svelte-kit/output/server/chunks/_slug_-e980138e.js
var slug_e980138e_exports = {};
__export(slug_e980138e_exports, {
  default: () => U5Bslugu5D,
  load: () => load3
});
import { faWineBottle as faWineBottle2, faHourglassHalf as faHourglassHalf2, faEye as faEye2, faEyeSlash as faEyeSlash2, faCalendarAlt, faUser, faCalendar, faClock, faTrash, faEdit, faClone } from "@fortawesome/free-solid-svg-icons";
import "cookie";
import "@lukeed/uuid";
function styleInject(t6, e) {
  e === void 0 && (e = {});
  var n = e.insertAt;
  if (t6 && typeof document != "undefined") {
    var i = document.head || document.getElementsByTagName("head")[0], a = document.createElement("style");
    a.type = "text/css", n === "top" && i.firstChild ? i.insertBefore(a, i.firstChild) : i.appendChild(a), a.styleSheet ? a.styleSheet.cssText = t6 : a.appendChild(document.createTextNode(t6));
  }
}
function $(t6, e) {
  return typeof t6 == "string" ? (e || document).querySelector(t6) : t6 || null;
}
function getOffset(t6) {
  var e = t6.getBoundingClientRect();
  return { top: e.top + (document.documentElement.scrollTop || document.body.scrollTop), left: e.left + (document.documentElement.scrollLeft || document.body.scrollLeft) };
}
function isHidden(t6) {
  return t6.offsetParent === null;
}
function isElementInViewport(t6) {
  var e = t6.getBoundingClientRect();
  return e.top >= 0 && e.left >= 0 && e.bottom <= (window.innerHeight || document.documentElement.clientHeight) && e.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function getElementContentWidth(t6) {
  var e = window.getComputedStyle(t6), n = parseFloat(e.paddingLeft) + parseFloat(e.paddingRight);
  return t6.clientWidth - n;
}
function fire(t6, e, n) {
  var i = document.createEvent("HTMLEvents");
  i.initEvent(e, true, true);
  for (var a in n)
    i[a] = n[a];
  return t6.dispatchEvent(i);
}
function getTopOffset(t6) {
  return t6.titleHeight + t6.margins.top + t6.paddings.top;
}
function getLeftOffset(t6) {
  return t6.margins.left + t6.paddings.left;
}
function getExtraHeight(t6) {
  return t6.margins.top + t6.margins.bottom + t6.paddings.top + t6.paddings.bottom + t6.titleHeight + t6.legendHeight;
}
function getExtraWidth(t6) {
  return t6.margins.left + t6.margins.right + t6.paddings.left + t6.paddings.right;
}
function _classCallCheck$4(t6, e) {
  if (!(t6 instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function floatTwo(t6) {
  return parseFloat(t6.toFixed(2));
}
function fillArray(t6, e, n) {
  var i = arguments.length > 3 && arguments[3] !== void 0 && arguments[3];
  n || (n = i ? t6[0] : t6[t6.length - 1]);
  var a = new Array(Math.abs(e)).fill(n);
  return t6 = i ? a.concat(t6) : t6.concat(a);
}
function getStringWidth(t6, e) {
  return (t6 + "").length * e;
}
function getPositionByAngle(t6, e) {
  return { x: Math.sin(t6 * ANGLE_RATIO) * e, y: Math.cos(t6 * ANGLE_RATIO) * e };
}
function isValidNumber(t6) {
  var e = arguments.length > 1 && arguments[1] !== void 0 && arguments[1];
  return !Number.isNaN(t6) && (t6 !== void 0 && (!!Number.isFinite(t6) && !(e && t6 < 0)));
}
function round(t6) {
  return Number(Math.round(t6 + "e4") + "e-4");
}
function deepClone(t6) {
  var e = void 0, n = void 0, i = void 0;
  if (t6 instanceof Date)
    return new Date(t6.getTime());
  if ((t6 === void 0 ? "undefined" : _typeof$2(t6)) !== "object" || t6 === null)
    return t6;
  e = Array.isArray(t6) ? [] : {};
  for (i in t6)
    n = t6[i], e[i] = deepClone(n);
  return e;
}
function getBarHeightAndYAttr(t6, e) {
  var n = void 0, i = void 0;
  return t6 <= e ? (n = e - t6, i = t6) : (n = t6 - e, i = e), [n, i];
}
function equilizeNoOfElements(t6, e) {
  var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : e.length - t6.length;
  return n > 0 ? t6 = fillArray(t6, n) : e = fillArray(e, n), [t6, e];
}
function truncateString(t6, e) {
  if (t6)
    return t6.length > e ? t6.slice(0, e - 3) + "..." : t6;
}
function shortenLargeNumber(t6) {
  var e = void 0;
  if (typeof t6 == "number")
    e = t6;
  else if (typeof t6 == "string" && (e = Number(t6), Number.isNaN(e)))
    return t6;
  var n = Math.floor(Math.log10(Math.abs(e)));
  if (n <= 2)
    return e;
  var i = Math.floor(n / 3), a = Math.pow(10, n - 3 * i) * +(e / Math.pow(10, n)).toFixed(1);
  return Math.round(100 * a) / 100 + " " + ["", "K", "M", "B", "T"][i];
}
function getSplineCurvePointsStr(t6, e) {
  for (var n = [], i = 0; i < t6.length; i++)
    n.push([t6[i], e[i]]);
  var a = function(t7, e2) {
    var n2 = e2[0] - t7[0], i2 = e2[1] - t7[1];
    return { length: Math.sqrt(Math.pow(n2, 2) + Math.pow(i2, 2)), angle: Math.atan2(i2, n2) };
  }, r = function(t7, e2, n2, i2) {
    var r2 = a(e2 || t7, n2 || t7), o = r2.angle + (i2 ? Math.PI : 0), s2 = 0.2 * r2.length;
    return [t7[0] + Math.cos(o) * s2, t7[1] + Math.sin(o) * s2];
  };
  return function(t7, e2) {
    return t7.reduce(function(t8, n2, i2, a2) {
      return i2 === 0 ? n2[0] + "," + n2[1] : t8 + " " + e2(n2, i2, a2);
    }, "");
  }(n, function(t7, e2, n2) {
    var i2 = r(n2[e2 - 1], n2[e2 - 2], t7), a2 = r(t7, n2[e2 - 1], n2[e2 + 1], true);
    return "C " + i2[0] + "," + i2[1] + " " + a2[0] + "," + a2[1] + " " + t7[0] + "," + t7[1];
  });
}
function limitColor(t6) {
  return t6 > 255 ? 255 : t6 < 0 ? 0 : t6;
}
function lightenDarkenColor(t6, e) {
  var n = getColor(t6), i = false;
  n[0] == "#" && (n = n.slice(1), i = true);
  var a = parseInt(n, 16), r = limitColor((a >> 16) + e), o = limitColor((a >> 8 & 255) + e), s2 = limitColor((255 & a) + e);
  return (i ? "#" : "") + (s2 | o << 8 | r << 16).toString(16);
}
function isValidColor(t6) {
  var e = /(^\s*)(rgb|hsl)(a?)[(]\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*(?:,\s*([\d.]+)\s*)?[)]$/i;
  return /(^\s*)(#)((?:[A-Fa-f0-9]{3}){1,2})$/i.test(t6) || e.test(t6);
}
function $$1(t6, e) {
  return typeof t6 == "string" ? (e || document).querySelector(t6) : t6 || null;
}
function createSVG(t6, e) {
  var n = document.createElementNS("http://www.w3.org/2000/svg", t6);
  for (var i in e) {
    var a = e[i];
    if (i === "inside")
      $$1(a).appendChild(n);
    else if (i === "around") {
      var r = $$1(a);
      r.parentNode.insertBefore(n, r), n.appendChild(r);
    } else
      i === "styles" ? (a === void 0 ? "undefined" : _typeof$1(a)) === "object" && Object.keys(a).map(function(t7) {
        n.style[t7] = a[t7];
      }) : (i === "className" && (i = "class"), i === "innerHTML" ? n.textContent = a : n.setAttribute(i, a));
  }
  return n;
}
function renderVerticalGradient(t6, e) {
  return createSVG("linearGradient", { inside: t6, id: e, x1: 0, x2: 0, y1: 0, y2: 1 });
}
function setGradientStop(t6, e, n, i) {
  return createSVG("stop", { inside: t6, style: "stop-color: " + n, offset: e, "stop-opacity": i });
}
function makeSVGContainer(t6, e, n, i) {
  return createSVG("svg", { className: e, inside: t6, width: n, height: i });
}
function makeSVGDefs(t6) {
  return createSVG("defs", { inside: t6 });
}
function makeSVGGroup(t6) {
  var e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "", n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : void 0, i = { className: t6, transform: e };
  return n && (i.inside = n), createSVG("g", i);
}
function makePath(t6) {
  return createSVG("path", { className: arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "", d: t6, styles: { stroke: arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "none", fill: arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : "none", "stroke-width": arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 2 } });
}
function makeArcPathStr(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 1, r = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : 0, o = n.x + t6.x, s2 = n.y + t6.y, l = n.x + e.x, u = n.y + e.y;
  return "M" + n.x + " " + n.y + "\n		L" + o + " " + s2 + "\n		A " + i + " " + i + " 0 " + r + " " + (a ? 1 : 0) + "\n		" + l + " " + u + " z";
}
function makeCircleStr(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 1, r = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : 0, o = n.x + t6.x, s2 = n.y + t6.y, l = n.x + e.x, u = 2 * n.y, c = n.y + e.y;
  return "M" + n.x + " " + n.y + "\n		L" + o + " " + s2 + "\n		A " + i + " " + i + " 0 " + r + " " + (a ? 1 : 0) + "\n		" + l + " " + u + " z\n		L" + o + " " + u + "\n		A " + i + " " + i + " 0 " + r + " " + (a ? 1 : 0) + "\n		" + l + " " + c + " z";
}
function makeArcStrokePathStr(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 1, r = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : 0, o = n.x + t6.x, s2 = n.y + t6.y, l = n.x + e.x, u = n.y + e.y;
  return "M" + o + " " + s2 + "\n		A " + i + " " + i + " 0 " + r + " " + (a ? 1 : 0) + "\n		" + l + " " + u;
}
function makeStrokeCircleStr(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 1, r = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : 0, o = n.x + t6.x, s2 = n.y + t6.y, l = n.x + e.x, u = 2 * i + s2, c = n.y + t6.y;
  return "M" + o + " " + s2 + "\n		A " + i + " " + i + " 0 " + r + " " + (a ? 1 : 0) + "\n		" + l + " " + u + "\n		M" + o + " " + u + "\n		A " + i + " " + i + " 0 " + r + " " + (a ? 1 : 0) + "\n		" + l + " " + c;
}
function makeGradient(t6, e) {
  var n = arguments.length > 2 && arguments[2] !== void 0 && arguments[2], i = "path-fill-gradient-" + e + "-" + (n ? "lighter" : "default"), a = renderVerticalGradient(t6, i), r = [1, 0.6, 0.2];
  return n && (r = [0.4, 0.2, 0]), setGradientStop(a, "0%", e, r[0]), setGradientStop(a, "50%", e, r[1]), setGradientStop(a, "100%", e, r[2]), i;
}
function percentageBar(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : PERCENTAGE_BAR_DEFAULT_DEPTH, r = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : "none";
  return createSVG("rect", { className: "percentage-bar", x: t6, y: e, width: n, height: i, fill: r, styles: { stroke: lightenDarkenColor(r, -25), "stroke-dasharray": "0, " + (i + n) + ", " + n + ", " + i, "stroke-width": a } });
}
function heatSquare(t6, e, n, i, a) {
  var r = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : "none", o = arguments.length > 6 && arguments[6] !== void 0 ? arguments[6] : {}, s2 = { className: t6, x: e, y: n, width: i, height: i, rx: a, fill: r };
  return Object.keys(o).map(function(t7) {
    s2[t7] = o[t7];
  }), createSVG("rect", s2);
}
function legendBar(t6, e, n) {
  var i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : "none", a = arguments[4];
  a = arguments.length > 5 && arguments[5] !== void 0 && arguments[5] ? truncateString(a, LABEL_MAX_CHARS) : a;
  var r = { className: "legend-bar", x: 0, y: 0, width: n, height: "2px", fill: i }, o = createSVG("text", { className: "legend-dataset-text", x: 0, y: 0, dy: 2 * FONT_SIZE + "px", "font-size": 1.2 * FONT_SIZE + "px", "text-anchor": "start", fill: FONT_FILL, innerHTML: a }), s2 = createSVG("g", { transform: "translate(" + t6 + ", " + e + ")" });
  return s2.appendChild(createSVG("rect", r)), s2.appendChild(o), s2;
}
function legendDot(t6, e, n) {
  var i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : "none", a = arguments[4];
  a = arguments.length > 5 && arguments[5] !== void 0 && arguments[5] ? truncateString(a, LABEL_MAX_CHARS) : a;
  var r = { className: "legend-dot", cx: 0, cy: 0, r: n, fill: i }, o = createSVG("text", { className: "legend-dataset-text", x: 0, y: 0, dx: FONT_SIZE + "px", dy: FONT_SIZE / 3 + "px", "font-size": 1.2 * FONT_SIZE + "px", "text-anchor": "start", fill: FONT_FILL, innerHTML: a }), s2 = createSVG("g", { transform: "translate(" + t6 + ", " + e + ")" });
  return s2.appendChild(createSVG("circle", r)), s2.appendChild(o), s2;
}
function makeText(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {}, r = a.fontSize || FONT_SIZE;
  return createSVG("text", { className: t6, x: e, y: n, dy: (a.dy !== void 0 ? a.dy : r / 2) + "px", "font-size": r + "px", fill: a.fill || FONT_FILL, "text-anchor": a.textAnchor || "start", innerHTML: i });
}
function makeVertLine(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {};
  a.stroke || (a.stroke = BASE_LINE_COLOR);
  var r = createSVG("line", { className: "line-vertical " + a.className, x1: 0, x2: 0, y1: n, y2: i, styles: { stroke: a.stroke } }), o = createSVG("text", { x: 0, y: n > i ? n + LABEL_MARGIN : n - LABEL_MARGIN - FONT_SIZE, dy: FONT_SIZE + "px", "font-size": FONT_SIZE + "px", "text-anchor": "middle", innerHTML: e + "" }), s2 = createSVG("g", { transform: "translate(" + t6 + ", 0)" });
  return s2.appendChild(r), s2.appendChild(o), s2;
}
function makeHoriLine(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {};
  a.stroke || (a.stroke = BASE_LINE_COLOR), a.lineType || (a.lineType = ""), a.shortenNumbers && (e = shortenLargeNumber(e));
  var r = createSVG("line", { className: "line-horizontal " + a.className + (a.lineType === "dashed" ? "dashed" : ""), x1: n, x2: i, y1: 0, y2: 0, styles: { stroke: a.stroke } }), o = createSVG("text", { x: n < i ? n - LABEL_MARGIN : n + LABEL_MARGIN, y: 0, dy: FONT_SIZE / 2 - 2 + "px", "font-size": FONT_SIZE + "px", "text-anchor": n < i ? "end" : "start", innerHTML: e + "" }), s2 = createSVG("g", { transform: "translate(0, " + t6 + ")", "stroke-opacity": 1 });
  return o !== 0 && o !== "0" || (s2.style.stroke = "rgba(27, 31, 35, 0.6)"), s2.appendChild(r), s2.appendChild(o), s2;
}
function yLine(t6, e, n) {
  var i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
  isValidNumber(t6) || (t6 = 0), i.pos || (i.pos = "left"), i.offset || (i.offset = 0), i.mode || (i.mode = "span"), i.stroke || (i.stroke = BASE_LINE_COLOR), i.className || (i.className = "");
  var a = -1 * AXIS_TICK_LENGTH, r = i.mode === "span" ? n + AXIS_TICK_LENGTH : 0;
  return i.mode === "tick" && i.pos === "right" && (a = n + AXIS_TICK_LENGTH, r = n), a += i.offset, r += i.offset, makeHoriLine(t6, e, a, r, { stroke: i.stroke, className: i.className, lineType: i.lineType, shortenNumbers: i.shortenNumbers });
}
function xLine(t6, e, n) {
  var i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
  isValidNumber(t6) || (t6 = 0), i.pos || (i.pos = "bottom"), i.offset || (i.offset = 0), i.mode || (i.mode = "span"), i.stroke || (i.stroke = BASE_LINE_COLOR), i.className || (i.className = "");
  var a = n + AXIS_TICK_LENGTH, r = i.mode === "span" ? -1 * AXIS_TICK_LENGTH : n;
  return i.mode === "tick" && i.pos === "top" && (a = -1 * AXIS_TICK_LENGTH, r = 0), makeVertLine(t6, e, a, r, { stroke: i.stroke, className: i.className, lineType: i.lineType });
}
function yMarker(t6, e, n) {
  var i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
  i.labelPos || (i.labelPos = "right");
  var a = createSVG("text", { className: "chart-label", x: i.labelPos === "left" ? LABEL_MARGIN : n - getStringWidth(e, 5) - LABEL_MARGIN, y: 0, dy: FONT_SIZE / -2 + "px", "font-size": FONT_SIZE + "px", "text-anchor": "start", innerHTML: e + "" }), r = makeHoriLine(t6, "", 0, n, { stroke: i.stroke || BASE_LINE_COLOR, className: i.className || "", lineType: i.lineType });
  return r.appendChild(a), r;
}
function yRegion(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {}, r = t6 - e, o = createSVG("rect", { className: "bar mini", styles: { fill: "rgba(228, 234, 239, 0.49)", stroke: BASE_LINE_COLOR, "stroke-dasharray": n + ", " + r }, x: 0, y: 0, width: n, height: r });
  a.labelPos || (a.labelPos = "right");
  var s2 = createSVG("text", { className: "chart-label", x: a.labelPos === "left" ? LABEL_MARGIN : n - getStringWidth(i + "", 4.5) - LABEL_MARGIN, y: 0, dy: FONT_SIZE / -2 + "px", "font-size": FONT_SIZE + "px", "text-anchor": "start", innerHTML: i + "" }), l = createSVG("g", { transform: "translate(0, " + e + ")" });
  return l.appendChild(o), l.appendChild(s2), l;
}
function datasetBar(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : "", r = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : 0, o = arguments.length > 6 && arguments[6] !== void 0 ? arguments[6] : 0, s2 = arguments.length > 7 && arguments[7] !== void 0 ? arguments[7] : {}, l = getBarHeightAndYAttr(e, s2.zeroLine), u = _slicedToArray(l, 2), c = u[0], h = u[1];
  h -= o, c === 0 && (c = s2.minHeight, h -= s2.minHeight), isValidNumber(t6) || (t6 = 0), isValidNumber(h) || (h = 0), isValidNumber(c, true) || (c = 0), isValidNumber(n, true) || (n = 0);
  var d2 = createSVG("rect", { className: "bar mini", style: "fill: " + i, "data-point-index": r, x: t6, y: h, width: n, height: c });
  if ((a += "") || a.length) {
    d2.setAttribute("y", 0), d2.setAttribute("x", 0);
    var f = createSVG("text", { className: "data-point-value", x: n / 2, y: 0, dy: FONT_SIZE / 2 * -1 + "px", "font-size": FONT_SIZE + "px", "text-anchor": "middle", innerHTML: a }), p = createSVG("g", { "data-point-index": r, transform: "translate(" + t6 + ", " + h + ")" });
    return p.appendChild(d2), p.appendChild(f), p;
  }
  return d2;
}
function datasetDot(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : "", r = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : 0, o = createSVG("circle", { style: "fill: " + i, "data-point-index": r, cx: t6, cy: e, r: n });
  if ((a += "") || a.length) {
    o.setAttribute("cy", 0), o.setAttribute("cx", 0);
    var s2 = createSVG("text", { className: "data-point-value", x: 0, y: 0, dy: FONT_SIZE / 2 * -1 - n + "px", "font-size": FONT_SIZE + "px", "text-anchor": "middle", innerHTML: a }), l = createSVG("g", { "data-point-index": r, transform: "translate(" + t6 + ", " + e + ")" });
    return l.appendChild(o), l.appendChild(s2), l;
  }
  return o;
}
function getPaths(t6, e, n) {
  var i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {}, a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {}, r = e.map(function(e2, n2) {
    return t6[n2] + "," + e2;
  }).join("L");
  i.spline && (r = getSplineCurvePointsStr(t6, e));
  var o = makePath("M" + r, "line-graph-path", n);
  if (i.heatline) {
    var s2 = makeGradient(a.svgDefs, n);
    o.style.stroke = "url(#" + s2 + ")";
  }
  var l = { path: o };
  if (i.regionFill) {
    var u = makeGradient(a.svgDefs, n, true), c = "M" + t6[0] + "," + a.zeroLine + "L" + r + "L" + t6.slice(-1)[0] + "," + a.zeroLine;
    l.region = makePath(c, "region-fill", "none", "url(#" + u + ")");
  }
  return l;
}
function translate(t6, e, n, i) {
  var a = typeof e == "string" ? e : e.join(", ");
  return [t6, { transform: n.join(", ") }, i, STD_EASING, "translate", { transform: a }];
}
function translateVertLine(t6, e, n) {
  return translate(t6, [n, 0], [e, 0], MARKER_LINE_ANIM_DUR);
}
function translateHoriLine(t6, e, n) {
  return translate(t6, [0, n], [0, e], MARKER_LINE_ANIM_DUR);
}
function animateRegion(t6, e, n, i) {
  var a = e - n, r = t6.childNodes[0];
  return [[r, { height: a, "stroke-dasharray": r.getAttribute("width") + ", " + a }, MARKER_LINE_ANIM_DUR, STD_EASING], translate(t6, [0, i], [0, n], MARKER_LINE_ANIM_DUR)];
}
function animateBar(t6, e, n, i) {
  var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 0, r = getBarHeightAndYAttr(n, (arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : {}).zeroLine), o = _slicedToArray$2(r, 2), s2 = o[0], l = o[1];
  return l -= a, t6.nodeName !== "rect" ? [[t6.childNodes[0], { width: i, height: s2 }, UNIT_ANIM_DUR, STD_EASING], translate(t6, t6.getAttribute("transform").split("(")[1].slice(0, -1), [e, l], MARKER_LINE_ANIM_DUR)] : [[t6, { width: i, height: s2, x: e, y: l }, UNIT_ANIM_DUR, STD_EASING]];
}
function animateDot(t6, e, n) {
  return t6.nodeName !== "circle" ? [translate(t6, t6.getAttribute("transform").split("(")[1].slice(0, -1), [e, n], MARKER_LINE_ANIM_DUR)] : [[t6, { cx: e, cy: n }, UNIT_ANIM_DUR, STD_EASING]];
}
function animatePath(t6, e, n, i, a) {
  var r = [], o = n.map(function(t7, n2) {
    return e[n2] + "," + t7;
  }).join("L");
  a && (o = getSplineCurvePointsStr(e, n));
  var s2 = [t6.path, { d: "M" + o }, PATH_ANIM_DUR, STD_EASING];
  if (r.push(s2), t6.region) {
    var l = e[0] + "," + i + "L", u = "L" + e.slice(-1)[0] + ", " + i, c = [t6.region, { d: "M" + l + o + u }, PATH_ANIM_DUR, STD_EASING];
    r.push(c);
  }
  return r;
}
function animatePathStr(t6, e) {
  return [t6, { d: e }, UNIT_ANIM_DUR, STD_EASING];
}
function _toConsumableArray$1(t6) {
  if (Array.isArray(t6)) {
    for (var e = 0, n = Array(t6.length); e < t6.length; e++)
      n[e] = t6[e];
    return n;
  }
  return Array.from(t6);
}
function animateSVGElement(t6, e, n) {
  var i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : "linear", a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : void 0, r = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : {}, o = t6.cloneNode(true), s2 = t6.cloneNode(true);
  for (var l in e) {
    var u = void 0;
    u = l === "transform" ? document.createElementNS("http://www.w3.org/2000/svg", "animateTransform") : document.createElementNS("http://www.w3.org/2000/svg", "animate");
    var c = r[l] || t6.getAttribute(l), h = e[l], d2 = { attributeName: l, from: c, to: h, begin: "0s", dur: n / 1e3 + "s", values: c + ";" + h, keySplines: EASING[i], keyTimes: "0;1", calcMode: "spline", fill: "freeze" };
    a && (d2.type = a);
    for (var f in d2)
      u.setAttribute(f, d2[f]);
    o.appendChild(u), a ? s2.setAttribute(l, "translate(" + h + ")") : s2.setAttribute(l, h);
  }
  return [o, s2];
}
function transform(t6, e) {
  t6.style.transform = e, t6.style.webkitTransform = e, t6.style.msTransform = e, t6.style.mozTransform = e, t6.style.oTransform = e;
}
function animateSVG(t6, e) {
  var n = [], i = [];
  e.map(function(t7) {
    var e2 = t7[0], a2 = e2.parentNode, r = void 0, o = void 0;
    t7[0] = e2;
    var s2 = animateSVGElement.apply(void 0, _toConsumableArray$1(t7)), l = _slicedToArray$1(s2, 2);
    r = l[0], o = l[1], n.push(o), i.push([r, a2]), a2 && a2.replaceChild(r, e2);
  });
  var a = t6.cloneNode(true);
  return i.map(function(t7, i2) {
    t7[1] && (t7[1].replaceChild(n[i2], t7[0]), e[i2][0] = n[i2]);
  }), a;
}
function runSMILAnimation(t6, e, n) {
  if (n.length !== 0) {
    var i = animateSVG(e, n);
    e.parentNode == t6 && (t6.removeChild(e), t6.appendChild(i)), setTimeout(function() {
      i.parentNode == t6 && (t6.removeChild(i), t6.appendChild(e));
    }, REPLACE_ALL_NEW_DUR);
  }
}
function downloadFile(t6, e) {
  var n = document.createElement("a");
  n.style = "display: none";
  var i = new Blob(e, { type: "image/svg+xml; charset=utf-8" }), a = window.URL.createObjectURL(i);
  n.href = a, n.download = t6, document.body.appendChild(n), n.click(), setTimeout(function() {
    document.body.removeChild(n), window.URL.revokeObjectURL(a);
  }, 300);
}
function prepareForExport(t6) {
  var e = t6.cloneNode(true);
  e.classList.add("chart-container"), e.setAttribute("xmlns", "http://www.w3.org/2000/svg"), e.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  var n = $.create("style", { innerHTML: CSSTEXT });
  e.insertBefore(n, e.firstChild);
  var i = $.create("div");
  return i.appendChild(e), i.innerHTML;
}
function _classCallCheck$3(t6, e) {
  if (!(t6 instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function _classCallCheck$2(t6, e) {
  if (!(t6 instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function _possibleConstructorReturn$1(t6, e) {
  if (!t6)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return !e || typeof e != "object" && typeof e != "function" ? t6 : e;
}
function _inherits$1(t6, e) {
  if (typeof e != "function" && e !== null)
    throw new TypeError("Super expression must either be null or a function, not " + typeof e);
  t6.prototype = Object.create(e && e.prototype, { constructor: { value: t6, enumerable: false, writable: true, configurable: true } }), e && (Object.setPrototypeOf ? Object.setPrototypeOf(t6, e) : t6.__proto__ = e);
}
function treatAsUtc(t6) {
  var e = new Date(t6);
  return e.setMinutes(e.getMinutes() - e.getTimezoneOffset()), e;
}
function getYyyyMmDd(t6) {
  var e = t6.getDate(), n = t6.getMonth() + 1;
  return [t6.getFullYear(), (n > 9 ? "" : "0") + n, (e > 9 ? "" : "0") + e].join("-");
}
function clone2(t6) {
  return new Date(t6.getTime());
}
function getWeeksBetween(t6, e) {
  var n = setDayToSunday(t6);
  return Math.ceil(getDaysBetween(n, e) / NO_OF_DAYS_IN_WEEK);
}
function getDaysBetween(t6, e) {
  var n = SEC_IN_DAY * NO_OF_MILLIS;
  return (treatAsUtc(e) - treatAsUtc(t6)) / n;
}
function areInSameMonth(t6, e) {
  return t6.getMonth() === e.getMonth() && t6.getFullYear() === e.getFullYear();
}
function getMonthName(t6) {
  var e = arguments.length > 1 && arguments[1] !== void 0 && arguments[1], n = MONTH_NAMES[t6];
  return e ? n.slice(0, 3) : n;
}
function getLastDateInMonth(t6, e) {
  return new Date(e, t6 + 1, 0);
}
function setDayToSunday(t6) {
  var e = clone2(t6), n = e.getDay();
  return n !== 0 && addDays(e, -1 * n), e;
}
function addDays(t6, e) {
  t6.setDate(t6.getDate() + e);
}
function _classCallCheck$5(t6, e) {
  if (!(t6 instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function getComponent(t6, e, n) {
  var i = Object.keys(componentConfigs).filter(function(e2) {
    return t6.includes(e2);
  }), a = componentConfigs[i[0]];
  return Object.assign(a, { constants: e, getData: n }), new ChartComponent(a);
}
function _toConsumableArray(t6) {
  if (Array.isArray(t6)) {
    for (var e = 0, n = Array(t6.length); e < t6.length; e++)
      n[e] = t6[e];
    return n;
  }
  return Array.from(t6);
}
function _classCallCheck$1(t6, e) {
  if (!(t6 instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function _possibleConstructorReturn(t6, e) {
  if (!t6)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return !e || typeof e != "object" && typeof e != "function" ? t6 : e;
}
function _inherits(t6, e) {
  if (typeof e != "function" && e !== null)
    throw new TypeError("Super expression must either be null or a function, not " + typeof e);
  t6.prototype = Object.create(e && e.prototype, { constructor: { value: t6, enumerable: false, writable: true, configurable: true } }), e && (Object.setPrototypeOf ? Object.setPrototypeOf(t6, e) : t6.__proto__ = e);
}
function _toConsumableArray$2(t6) {
  if (Array.isArray(t6)) {
    for (var e = 0, n = Array(t6.length); e < t6.length; e++)
      n[e] = t6[e];
    return n;
  }
  return Array.from(t6);
}
function _classCallCheck$6(t6, e) {
  if (!(t6 instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function _possibleConstructorReturn$2(t6, e) {
  if (!t6)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return !e || typeof e != "object" && typeof e != "function" ? t6 : e;
}
function _inherits$2(t6, e) {
  if (typeof e != "function" && e !== null)
    throw new TypeError("Super expression must either be null or a function, not " + typeof e);
  t6.prototype = Object.create(e && e.prototype, { constructor: { value: t6, enumerable: false, writable: true, configurable: true } }), e && (Object.setPrototypeOf ? Object.setPrototypeOf(t6, e) : t6.__proto__ = e);
}
function _toConsumableArray$4(t6) {
  if (Array.isArray(t6)) {
    for (var e = 0, n = Array(t6.length); e < t6.length; e++)
      n[e] = t6[e];
    return n;
  }
  return Array.from(t6);
}
function normalize2(t6) {
  if (t6 === 0)
    return [0, 0];
  if (isNaN(t6))
    return { mantissa: -6755399441055744, exponent: 972 };
  var e = t6 > 0 ? 1 : -1;
  if (!isFinite(t6))
    return { mantissa: 4503599627370496 * e, exponent: 972 };
  t6 = Math.abs(t6);
  var n = Math.floor(Math.log10(t6));
  return [e * (t6 / Math.pow(10, n)), n];
}
function getChartRangeIntervals(t6) {
  var e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = Math.ceil(t6), i = Math.floor(e), a = n - i, r = a, o = 1;
  a > 5 && (a % 2 != 0 && (a = ++n - i), r = a / 2, o = 2), a <= 2 && (o = a / (r = 4)), a === 0 && (r = 5, o = 1);
  for (var s2 = [], l = 0; l <= r; l++)
    s2.push(i + o * l);
  return s2;
}
function getChartIntervals(t6) {
  var e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = normalize2(t6), i = _slicedToArray$4(n, 2), a = i[0], r = i[1], o = e ? e / Math.pow(10, r) : 0, s2 = getChartRangeIntervals(a = a.toFixed(6), o);
  return s2 = s2.map(function(t7) {
    return t7 * Math.pow(10, r);
  });
}
function calcChartIntervals(t6) {
  function e(t7, e2) {
    for (var n2 = getChartIntervals(t7), i2 = n2[1] - n2[0], a2 = 0, r2 = 1; a2 < e2; r2++)
      a2 += i2, n2.unshift(-1 * a2);
    return n2;
  }
  var n = arguments.length > 1 && arguments[1] !== void 0 && arguments[1], i = Math.max.apply(Math, _toConsumableArray$4(t6)), a = Math.min.apply(Math, _toConsumableArray$4(t6)), r = [];
  if (i >= 0 && a >= 0)
    normalize2(i)[1], r = n ? getChartIntervals(i, a) : getChartIntervals(i);
  else if (i > 0 && a < 0) {
    var o = Math.abs(a);
    i >= o ? (normalize2(i)[1], r = e(i, o)) : (normalize2(o)[1], r = e(o, i).reverse().map(function(t7) {
      return -1 * t7;
    }));
  } else if (i <= 0 && a <= 0) {
    var s2 = Math.abs(a), l = Math.abs(i);
    normalize2(s2)[1], r = (r = n ? getChartIntervals(s2, l) : getChartIntervals(s2)).reverse().map(function(t7) {
      return -1 * t7;
    });
  }
  return r;
}
function getZeroIndex(t6) {
  var e = getIntervalSize(t6);
  return t6.indexOf(0) >= 0 ? t6.indexOf(0) : t6[0] > 0 ? -1 * t6[0] / e : -1 * t6[t6.length - 1] / e + (t6.length - 1);
}
function getIntervalSize(t6) {
  return t6[1] - t6[0];
}
function getValueRange(t6) {
  return t6[t6.length - 1] - t6[0];
}
function scale(t6, e) {
  return floatTwo(e.zeroLine - t6 * e.scaleMultiplier);
}
function getClosestInArray(t6, e) {
  var n = arguments.length > 2 && arguments[2] !== void 0 && arguments[2], i = e.reduce(function(e2, n2) {
    return Math.abs(n2 - t6) < Math.abs(e2 - t6) ? n2 : e2;
  }, []);
  return n ? e.indexOf(i) : i;
}
function calcDistribution(t6, e) {
  for (var n = Math.max.apply(Math, _toConsumableArray$4(t6)), i = 1 / (e - 1), a = [], r = 0; r < e; r++) {
    var o = n * (i * r);
    a.push(o);
  }
  return a;
}
function getMaxCheckpoint(t6, e) {
  return e.filter(function(e2) {
    return e2 < t6;
  }).length;
}
function _toConsumableArray$3(t6) {
  if (Array.isArray(t6)) {
    for (var e = 0, n = Array(t6.length); e < t6.length; e++)
      n[e] = t6[e];
    return n;
  }
  return Array.from(t6);
}
function _classCallCheck$7(t6, e) {
  if (!(t6 instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function _possibleConstructorReturn$3(t6, e) {
  if (!t6)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return !e || typeof e != "object" && typeof e != "function" ? t6 : e;
}
function _inherits$3(t6, e) {
  if (typeof e != "function" && e !== null)
    throw new TypeError("Super expression must either be null or a function, not " + typeof e);
  t6.prototype = Object.create(e && e.prototype, { constructor: { value: t6, enumerable: false, writable: true, configurable: true } }), e && (Object.setPrototypeOf ? Object.setPrototypeOf(t6, e) : t6.__proto__ = e);
}
function _toConsumableArray$6(t6) {
  if (Array.isArray(t6)) {
    for (var e = 0, n = Array(t6.length); e < t6.length; e++)
      n[e] = t6[e];
    return n;
  }
  return Array.from(t6);
}
function dataPrep(t6, e) {
  t6.labels = t6.labels || [];
  var n = t6.labels.length, i = t6.datasets, a = new Array(n).fill(0);
  return i || (i = [{ values: a }]), i.map(function(t7) {
    if (t7.values) {
      var i2 = t7.values;
      i2 = (i2 = i2.map(function(t8) {
        return isNaN(t8) ? 0 : t8;
      })).length > n ? i2.slice(0, n) : fillArray(i2, n - i2.length, 0), t7.values = i2;
    } else
      t7.values = a;
    t7.chartType || (t7.chartType = e);
  }), t6.yRegions && t6.yRegions.map(function(t7) {
    if (t7.end < t7.start) {
      var e2 = [t7.end, t7.start];
      t7.start = e2[0], t7.end = e2[1];
    }
  }), t6;
}
function zeroDataPrep(t6) {
  var e = t6.labels.length, n = new Array(e).fill(0), i = { labels: t6.labels.slice(0, -1), datasets: t6.datasets.map(function(t7) {
    return { name: "", values: n.slice(0, -1), chartType: t7.chartType };
  }) };
  return t6.yMarkers && (i.yMarkers = [{ value: 0, label: "" }]), t6.yRegions && (i.yRegions = [{ start: 0, end: 0, label: "" }]), i;
}
function getShortenedLabels(t6) {
  var e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [], n = !(arguments.length > 2 && arguments[2] !== void 0) || arguments[2], i = t6 / e.length;
  i <= 0 && (i = 1);
  var a = i / DEFAULT_CHAR_WIDTH, r = void 0;
  if (n) {
    var o = Math.max.apply(Math, _toConsumableArray$6(e.map(function(t7) {
      return t7.length;
    })));
    r = Math.ceil(o / a);
  }
  return e.map(function(t7, e2) {
    return (t7 += "").length > a && (n ? e2 % r != 0 && (t7 = "") : t7 = a - 3 > 0 ? t7.slice(0, a - 3) + " ..." : t7.slice(0, a) + ".."), t7;
  });
}
function _toConsumableArray$5(t6) {
  if (Array.isArray(t6)) {
    for (var e = 0, n = Array(t6.length); e < t6.length; e++)
      n[e] = t6[e];
    return n;
  }
  return Array.from(t6);
}
function _classCallCheck$8(t6, e) {
  if (!(t6 instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function _possibleConstructorReturn$4(t6, e) {
  if (!t6)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return !e || typeof e != "object" && typeof e != "function" ? t6 : e;
}
function _inherits$4(t6, e) {
  if (typeof e != "function" && e !== null)
    throw new TypeError("Super expression must either be null or a function, not " + typeof e);
  t6.prototype = Object.create(e && e.prototype, { constructor: { value: t6, enumerable: false, writable: true, configurable: true } }), e && (Object.setPrototypeOf ? Object.setPrototypeOf(t6, e) : t6.__proto__ = e);
}
function _toConsumableArray$7(t6) {
  if (Array.isArray(t6)) {
    for (var e = 0, n = Array(t6.length); e < t6.length; e++)
      n[e] = t6[e];
    return n;
  }
  return Array.from(t6);
}
function _classCallCheck$9(t6, e) {
  if (!(t6 instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function _possibleConstructorReturn$5(t6, e) {
  if (!t6)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return !e || typeof e != "object" && typeof e != "function" ? t6 : e;
}
function _inherits$5(t6, e) {
  if (typeof e != "function" && e !== null)
    throw new TypeError("Super expression must either be null or a function, not " + typeof e);
  t6.prototype = Object.create(e && e.prototype, { constructor: { value: t6, enumerable: false, writable: true, configurable: true } }), e && (Object.setPrototypeOf ? Object.setPrototypeOf(t6, e) : t6.__proto__ = e);
}
var css_248z, _typeof, BASE_MEASURES, INIT_CHART_UPDATE_TIMEOUT, CHART_POST_ANIMATE_TIMEOUT, AXIS_LEGEND_BAR_SIZE, BAR_CHART_SPACE_RATIO, MIN_BAR_PERCENT_HEIGHT, LINE_CHART_DOT_SIZE, DOT_OVERLAY_SIZE_INCR, PERCENTAGE_BAR_DEFAULT_HEIGHT, PERCENTAGE_BAR_DEFAULT_DEPTH, HEATMAP_DISTRIBUTION_SIZE, HEATMAP_SQUARE_SIZE, HEATMAP_GUTTER_SIZE, DEFAULT_CHAR_WIDTH, TOOLTIP_POINTER_TRIANGLE_HEIGHT, DEFAULT_CHART_COLORS, HEATMAP_COLORS_GREEN, DEFAULT_COLORS, ANGLE_RATIO, FULL_ANGLE, _createClass$3, SvgTip, _typeof$2, PRESET_COLOR_MAP, getColor, _slicedToArray, _typeof$1, AXIS_TICK_LENGTH, LABEL_MARGIN, LABEL_MAX_CHARS, FONT_SIZE, BASE_LINE_COLOR, FONT_FILL, makeOverlay, updateOverlay, _slicedToArray$2, UNIT_ANIM_DUR, PATH_ANIM_DUR, MARKER_LINE_ANIM_DUR, REPLACE_ALL_NEW_DUR, STD_EASING, _slicedToArray$1, EASING, CSSTEXT, _createClass$2, BaseChart, _createClass$1, _get$1, AggregationChart, NO_OF_YEAR_MONTHS, NO_OF_DAYS_IN_WEEK, NO_OF_MILLIS, SEC_IN_DAY, MONTH_NAMES, DAY_NAMES_SHORT, _slicedToArray$3, _createClass$4, ChartComponent, componentConfigs, _createClass, _get, _createClass$5, _get$2, _slicedToArray$4, _createClass$6, COL_WIDTH, ROW_HEIGHT, _createClass$7, _get$3, _createClass$8, _get$4, Base, load3, valuesOverPoints, title, height, U5Bslugu5D;
var init_slug_e980138e = __esm({
  ".svelte-kit/output/server/chunks/_slug_-e980138e.js"() {
    init_shims();
    init_app_d23b9461();
    init_user_b0829f99();
    init_fa_6986f2e9();
    init_ssr();
    css_248z = '.chart-container{position:relative;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica Neue,sans-serif}.chart-container .axis,.chart-container .chart-label{fill:#555b51}.chart-container .axis line,.chart-container .chart-label line{stroke:#dadada}.chart-container .dataset-units circle{stroke:#fff;stroke-width:2}.chart-container .dataset-units path{fill:none;stroke-opacity:1;stroke-width:2px}.chart-container .dataset-path{stroke-width:2px}.chart-container .path-group path{fill:none;stroke-opacity:1;stroke-width:2px}.chart-container line.dashed{stroke-dasharray:5,3}.chart-container .axis-line .specific-value{text-anchor:start}.chart-container .axis-line .y-line{text-anchor:end}.chart-container .axis-line .x-line{text-anchor:middle}.chart-container .legend-dataset-text{fill:#6c7680;font-weight:600}.graph-svg-tip{position:absolute;z-index:99999;padding:10px;font-size:12px;color:#959da5;text-align:center;background:rgba(0,0,0,.8);border-radius:3px}.graph-svg-tip ol,.graph-svg-tip ul{padding-left:0;display:-webkit-box;display:-ms-flexbox;display:flex}.graph-svg-tip ul.data-point-list li{min-width:90px;-webkit-box-flex:1;-ms-flex:1;flex:1;font-weight:600}.graph-svg-tip strong{color:#dfe2e5;font-weight:600}.graph-svg-tip .svg-pointer{position:absolute;height:5px;margin:0 0 0 -5px;content:" ";border:5px solid transparent;border-top-color:rgba(0,0,0,.8)}.graph-svg-tip.comparison{padding:0;text-align:left;pointer-events:none}.graph-svg-tip.comparison .title{display:block;padding:10px;margin:0;font-weight:600;line-height:1;pointer-events:none}.graph-svg-tip.comparison ul{margin:0;white-space:nowrap;list-style:none}.graph-svg-tip.comparison li{display:inline-block;padding:5px 10px}';
    styleInject(css_248z);
    _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t6) {
      return typeof t6;
    } : function(t6) {
      return t6 && typeof Symbol == "function" && t6.constructor === Symbol && t6 !== Symbol.prototype ? "symbol" : typeof t6;
    };
    $.create = function(t6, e) {
      var n = document.createElement(t6);
      for (var i in e) {
        var a = e[i];
        if (i === "inside")
          $(a).appendChild(n);
        else if (i === "around") {
          var r = $(a);
          r.parentNode.insertBefore(n, r), n.appendChild(r);
        } else
          i === "styles" ? (a === void 0 ? "undefined" : _typeof(a)) === "object" && Object.keys(a).map(function(t7) {
            n.style[t7] = a[t7];
          }) : i in n ? n[i] = a : n.setAttribute(i, a);
      }
      return n;
    };
    BASE_MEASURES = { margins: { top: 10, bottom: 10, left: 20, right: 20 }, paddings: { top: 20, bottom: 40, left: 30, right: 10 }, baseHeight: 240, titleHeight: 20, legendHeight: 30, titleFontSize: 12 };
    INIT_CHART_UPDATE_TIMEOUT = 700;
    CHART_POST_ANIMATE_TIMEOUT = 400;
    AXIS_LEGEND_BAR_SIZE = 100;
    BAR_CHART_SPACE_RATIO = 0.5;
    MIN_BAR_PERCENT_HEIGHT = 0;
    LINE_CHART_DOT_SIZE = 4;
    DOT_OVERLAY_SIZE_INCR = 4;
    PERCENTAGE_BAR_DEFAULT_HEIGHT = 20;
    PERCENTAGE_BAR_DEFAULT_DEPTH = 2;
    HEATMAP_DISTRIBUTION_SIZE = 5;
    HEATMAP_SQUARE_SIZE = 10;
    HEATMAP_GUTTER_SIZE = 2;
    DEFAULT_CHAR_WIDTH = 7;
    TOOLTIP_POINTER_TRIANGLE_HEIGHT = 5;
    DEFAULT_CHART_COLORS = ["light-blue", "blue", "violet", "red", "orange", "yellow", "green", "light-green", "purple", "magenta", "light-grey", "dark-grey"];
    HEATMAP_COLORS_GREEN = ["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"];
    DEFAULT_COLORS = { bar: DEFAULT_CHART_COLORS, line: DEFAULT_CHART_COLORS, pie: DEFAULT_CHART_COLORS, percentage: DEFAULT_CHART_COLORS, heatmap: HEATMAP_COLORS_GREEN, donut: DEFAULT_CHART_COLORS };
    ANGLE_RATIO = Math.PI / 180;
    FULL_ANGLE = 360;
    _createClass$3 = function() {
      function t6(t7, e) {
        for (var n = 0; n < e.length; n++) {
          var i = e[n];
          i.enumerable = i.enumerable || false, i.configurable = true, "value" in i && (i.writable = true), Object.defineProperty(t7, i.key, i);
        }
      }
      return function(e, n, i) {
        return n && t6(e.prototype, n), i && t6(e, i), e;
      };
    }();
    SvgTip = function() {
      function t6(e) {
        var n = e.parent, i = n === void 0 ? null : n, a = e.colors, r = a === void 0 ? [] : a;
        _classCallCheck$4(this, t6), this.parent = i, this.colors = r, this.titleName = "", this.titleValue = "", this.listValues = [], this.titleValueFirst = 0, this.x = 0, this.y = 0, this.top = 0, this.left = 0, this.setup();
      }
      return _createClass$3(t6, [{ key: "setup", value: function() {
        this.makeTooltip();
      } }, { key: "refresh", value: function() {
        this.fill(), this.calcPosition();
      } }, { key: "makeTooltip", value: function() {
        var t7 = this;
        this.container = $.create("div", { inside: this.parent, className: "graph-svg-tip comparison", innerHTML: '<span class="title"></span>\n				<ul class="data-point-list"></ul>\n				<div class="svg-pointer"></div>' }), this.hideTip(), this.title = this.container.querySelector(".title"), this.dataPointList = this.container.querySelector(".data-point-list"), this.parent.addEventListener("mouseleave", function() {
          t7.hideTip();
        });
      } }, { key: "fill", value: function() {
        var t7 = this, e = void 0;
        this.index && this.container.setAttribute("data-point-index", this.index), e = this.titleValueFirst ? "<strong>" + this.titleValue + "</strong>" + this.titleName : this.titleName + "<strong>" + this.titleValue + "</strong>", this.title.innerHTML = e, this.dataPointList.innerHTML = "", this.listValues.map(function(e2, n) {
          var i = t7.colors[n] || "black", a = e2.formatted === 0 || e2.formatted ? e2.formatted : e2.value, r = $.create("li", { styles: { "border-top": "3px solid " + i }, innerHTML: '<strong style="display: block;">' + (a === 0 || a ? a : "") + "</strong>\n					" + (e2.title ? e2.title : "") });
          t7.dataPointList.appendChild(r);
        });
      } }, { key: "calcPosition", value: function() {
        var t7 = this.container.offsetWidth;
        this.top = this.y - this.container.offsetHeight - TOOLTIP_POINTER_TRIANGLE_HEIGHT, this.left = this.x - t7 / 2;
        var e = this.parent.offsetWidth - t7, n = this.container.querySelector(".svg-pointer");
        if (this.left < 0)
          n.style.left = "calc(50% - " + -1 * this.left + "px)", this.left = 0;
        else if (this.left > e) {
          var i = "calc(50% + " + (this.left - e) + "px)";
          n.style.left = i, this.left = e;
        } else
          n.style.left = "50%";
      } }, { key: "setValues", value: function(t7, e) {
        var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : [], a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : -1;
        this.titleName = n.name, this.titleValue = n.value, this.listValues = i, this.x = t7, this.y = e, this.titleValueFirst = n.valueFirst || 0, this.index = a, this.refresh();
      } }, { key: "hideTip", value: function() {
        this.container.style.top = "0px", this.container.style.left = "0px", this.container.style.opacity = "0";
      } }, { key: "showTip", value: function() {
        this.container.style.top = this.top + "px", this.container.style.left = this.left + "px", this.container.style.opacity = "1";
      } }]), t6;
    }();
    _typeof$2 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t6) {
      return typeof t6;
    } : function(t6) {
      return t6 && typeof Symbol == "function" && t6.constructor === Symbol && t6 !== Symbol.prototype ? "symbol" : typeof t6;
    };
    PRESET_COLOR_MAP = { "light-blue": "#7cd6fd", blue: "#5e64ff", violet: "#743ee2", red: "#ff5858", orange: "#ffa00a", yellow: "#feef72", green: "#28a745", "light-green": "#98d85b", purple: "#b554ff", magenta: "#ffa3ef", black: "#36114C", grey: "#bdd3e6", "light-grey": "#f0f4f7", "dark-grey": "#b8c2cc" };
    getColor = function(t6) {
      return /rgb[a]{0,1}\([\d, ]+\)/gim.test(t6) ? /\D+(\d*)\D+(\d*)\D+(\d*)/gim.exec(t6).map(function(t7, e) {
        return e !== 0 ? Number(t7).toString(16) : "#";
      }).reduce(function(t7, e) {
        return "" + t7 + e;
      }) : PRESET_COLOR_MAP[t6] || t6;
    };
    _slicedToArray = function() {
      function t6(t7, e) {
        var n = [], i = true, a = false, r = void 0;
        try {
          for (var o, s2 = t7[Symbol.iterator](); !(i = (o = s2.next()).done) && (n.push(o.value), !e || n.length !== e); i = true)
            ;
        } catch (t8) {
          a = true, r = t8;
        } finally {
          try {
            !i && s2.return && s2.return();
          } finally {
            if (a)
              throw r;
          }
        }
        return n;
      }
      return function(e, n) {
        if (Array.isArray(e))
          return e;
        if (Symbol.iterator in Object(e))
          return t6(e, n);
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      };
    }();
    _typeof$1 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t6) {
      return typeof t6;
    } : function(t6) {
      return t6 && typeof Symbol == "function" && t6.constructor === Symbol && t6 !== Symbol.prototype ? "symbol" : typeof t6;
    };
    AXIS_TICK_LENGTH = 6;
    LABEL_MARGIN = 4;
    LABEL_MAX_CHARS = 15;
    FONT_SIZE = 10;
    BASE_LINE_COLOR = "#dadada";
    FONT_FILL = "#555b51";
    makeOverlay = { bar: function(t6) {
      var e = void 0;
      t6.nodeName !== "rect" && (e = t6.getAttribute("transform"), t6 = t6.childNodes[0]);
      var n = t6.cloneNode();
      return n.style.fill = "#000000", n.style.opacity = "0.4", e && n.setAttribute("transform", e), n;
    }, dot: function(t6) {
      var e = void 0;
      t6.nodeName !== "circle" && (e = t6.getAttribute("transform"), t6 = t6.childNodes[0]);
      var n = t6.cloneNode(), i = t6.getAttribute("r"), a = t6.getAttribute("fill");
      return n.setAttribute("r", parseInt(i) + DOT_OVERLAY_SIZE_INCR), n.setAttribute("fill", a), n.style.opacity = "0.6", e && n.setAttribute("transform", e), n;
    }, heat_square: function(t6) {
      var e = void 0;
      t6.nodeName !== "circle" && (e = t6.getAttribute("transform"), t6 = t6.childNodes[0]);
      var n = t6.cloneNode(), i = t6.getAttribute("r"), a = t6.getAttribute("fill");
      return n.setAttribute("r", parseInt(i) + DOT_OVERLAY_SIZE_INCR), n.setAttribute("fill", a), n.style.opacity = "0.6", e && n.setAttribute("transform", e), n;
    } };
    updateOverlay = { bar: function(t6, e) {
      var n = void 0;
      t6.nodeName !== "rect" && (n = t6.getAttribute("transform"), t6 = t6.childNodes[0]);
      var i = ["x", "y", "width", "height"];
      Object.values(t6.attributes).filter(function(t7) {
        return i.includes(t7.name) && t7.specified;
      }).map(function(t7) {
        e.setAttribute(t7.name, t7.nodeValue);
      }), n && e.setAttribute("transform", n);
    }, dot: function(t6, e) {
      var n = void 0;
      t6.nodeName !== "circle" && (n = t6.getAttribute("transform"), t6 = t6.childNodes[0]);
      var i = ["cx", "cy"];
      Object.values(t6.attributes).filter(function(t7) {
        return i.includes(t7.name) && t7.specified;
      }).map(function(t7) {
        e.setAttribute(t7.name, t7.nodeValue);
      }), n && e.setAttribute("transform", n);
    }, heat_square: function(t6, e) {
      var n = void 0;
      t6.nodeName !== "circle" && (n = t6.getAttribute("transform"), t6 = t6.childNodes[0]);
      var i = ["cx", "cy"];
      Object.values(t6.attributes).filter(function(t7) {
        return i.includes(t7.name) && t7.specified;
      }).map(function(t7) {
        e.setAttribute(t7.name, t7.nodeValue);
      }), n && e.setAttribute("transform", n);
    } };
    _slicedToArray$2 = function() {
      function t6(t7, e) {
        var n = [], i = true, a = false, r = void 0;
        try {
          for (var o, s2 = t7[Symbol.iterator](); !(i = (o = s2.next()).done) && (n.push(o.value), !e || n.length !== e); i = true)
            ;
        } catch (t8) {
          a = true, r = t8;
        } finally {
          try {
            !i && s2.return && s2.return();
          } finally {
            if (a)
              throw r;
          }
        }
        return n;
      }
      return function(e, n) {
        if (Array.isArray(e))
          return e;
        if (Symbol.iterator in Object(e))
          return t6(e, n);
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      };
    }();
    UNIT_ANIM_DUR = 350;
    PATH_ANIM_DUR = 350;
    MARKER_LINE_ANIM_DUR = UNIT_ANIM_DUR;
    REPLACE_ALL_NEW_DUR = 250;
    STD_EASING = "easein";
    _slicedToArray$1 = function() {
      function t6(t7, e) {
        var n = [], i = true, a = false, r = void 0;
        try {
          for (var o, s2 = t7[Symbol.iterator](); !(i = (o = s2.next()).done) && (n.push(o.value), !e || n.length !== e); i = true)
            ;
        } catch (t8) {
          a = true, r = t8;
        } finally {
          try {
            !i && s2.return && s2.return();
          } finally {
            if (a)
              throw r;
          }
        }
        return n;
      }
      return function(e, n) {
        if (Array.isArray(e))
          return e;
        if (Symbol.iterator in Object(e))
          return t6(e, n);
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      };
    }();
    EASING = { ease: "0.25 0.1 0.25 1", linear: "0 0 1 1", easein: "0.1 0.8 0.2 1", easeout: "0 0 0.58 1", easeinout: "0.42 0 0.58 1" };
    CSSTEXT = ".chart-container{position:relative;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif}.chart-container .axis,.chart-container .chart-label{fill:#555b51}.chart-container .axis line,.chart-container .chart-label line{stroke:#dadada}.chart-container .dataset-units circle{stroke:#fff;stroke-width:2}.chart-container .dataset-units path{fill:none;stroke-opacity:1;stroke-width:2px}.chart-container .dataset-path{stroke-width:2px}.chart-container .path-group path{fill:none;stroke-opacity:1;stroke-width:2px}.chart-container line.dashed{stroke-dasharray:5,3}.chart-container .axis-line .specific-value{text-anchor:start}.chart-container .axis-line .y-line{text-anchor:end}.chart-container .axis-line .x-line{text-anchor:middle}.chart-container .legend-dataset-text{fill:#6c7680;font-weight:600}.graph-svg-tip{position:absolute;z-index:99999;padding:10px;font-size:12px;color:#959da5;text-align:center;background:rgba(0,0,0,.8);border-radius:3px}.graph-svg-tip ul{padding-left:0;display:flex}.graph-svg-tip ol{padding-left:0;display:flex}.graph-svg-tip ul.data-point-list li{min-width:90px;flex:1;font-weight:600}.graph-svg-tip strong{color:#dfe2e5;font-weight:600}.graph-svg-tip .svg-pointer{position:absolute;height:5px;margin:0 0 0 -5px;content:' ';border:5px solid transparent;border-top-color:rgba(0,0,0,.8)}.graph-svg-tip.comparison{padding:0;text-align:left;pointer-events:none}.graph-svg-tip.comparison .title{display:block;padding:10px;margin:0;font-weight:600;line-height:1;pointer-events:none}.graph-svg-tip.comparison ul{margin:0;white-space:nowrap;list-style:none}.graph-svg-tip.comparison li{display:inline-block;padding:5px 10px}";
    _createClass$2 = function() {
      function t6(t7, e) {
        for (var n = 0; n < e.length; n++) {
          var i = e[n];
          i.enumerable = i.enumerable || false, i.configurable = true, "value" in i && (i.writable = true), Object.defineProperty(t7, i.key, i);
        }
      }
      return function(e, n, i) {
        return n && t6(e.prototype, n), i && t6(e, i), e;
      };
    }();
    BaseChart = function() {
      function t6(e, n) {
        if (_classCallCheck$3(this, t6), n = deepClone(n), this.parent = typeof e == "string" ? document.querySelector(e) : e, !(this.parent instanceof HTMLElement))
          throw new Error("No `parent` element to render on was provided.");
        this.rawChartArgs = n, this.title = n.title || "", this.type = n.type || "", this.realData = this.prepareData(n.data), this.data = this.prepareFirstData(this.realData), this.colors = this.validateColors(n.colors, this.type), this.config = { showTooltip: 1, showLegend: 1, isNavigable: n.isNavigable || 0, animate: n.animate !== void 0 ? n.animate : 1, truncateLegends: n.truncateLegends || 1 }, this.measures = JSON.parse(JSON.stringify(BASE_MEASURES));
        var i = this.measures;
        this.setMeasures(n), this.title.length || (i.titleHeight = 0), this.config.showLegend || (i.legendHeight = 0), this.argHeight = n.height || i.baseHeight, this.state = {}, this.options = {}, this.initTimeout = INIT_CHART_UPDATE_TIMEOUT, this.config.isNavigable && (this.overlays = []), this.configure(n);
      }
      return _createClass$2(t6, [{ key: "prepareData", value: function(t7) {
        return t7;
      } }, { key: "prepareFirstData", value: function(t7) {
        return t7;
      } }, { key: "validateColors", value: function(t7, e) {
        var n = [];
        return (t7 = (t7 || []).concat(DEFAULT_COLORS[e])).forEach(function(t8) {
          var e2 = getColor(t8);
          isValidColor(e2) ? n.push(e2) : console.warn('"' + t8 + '" is not a valid color.');
        }), n;
      } }, { key: "setMeasures", value: function() {
      } }, { key: "configure", value: function() {
        var t7 = this, e = this.argHeight;
        this.baseHeight = e, this.height = e - getExtraHeight(this.measures), this.boundDrawFn = function() {
          return t7.draw(true);
        }, ResizeObserver && (this.resizeObserver = new ResizeObserver(this.boundDrawFn), this.resizeObserver.observe(this.parent)), window.addEventListener("resize", this.boundDrawFn), window.addEventListener("orientationchange", this.boundDrawFn);
      } }, { key: "destroy", value: function() {
        this.resizeObserver && this.resizeObserver.disconnect(), window.removeEventListener("resize", this.boundDrawFn), window.removeEventListener("orientationchange", this.boundDrawFn);
      } }, { key: "setup", value: function() {
        this.makeContainer(), this.updateWidth(), this.makeTooltip(), this.draw(false, true);
      } }, { key: "makeContainer", value: function() {
        this.parent.innerHTML = "";
        var t7 = { inside: this.parent, className: "chart-container" };
        this.independentWidth && (t7.styles = { width: this.independentWidth + "px" }), this.container = $.create("div", t7);
      } }, { key: "makeTooltip", value: function() {
        this.tip = new SvgTip({ parent: this.container, colors: this.colors }), this.bindTooltip();
      } }, { key: "bindTooltip", value: function() {
      } }, { key: "draw", value: function() {
        var t7 = this, e = arguments.length > 0 && arguments[0] !== void 0 && arguments[0], n = arguments.length > 1 && arguments[1] !== void 0 && arguments[1];
        e && isHidden(this.parent) || (this.updateWidth(), this.calc(e), this.makeChartArea(), this.setupComponents(), this.components.forEach(function(e2) {
          return e2.setup(t7.drawArea);
        }), this.render(this.components, false), n && (this.data = this.realData, setTimeout(function() {
          t7.update(t7.data);
        }, this.initTimeout)), this.renderLegend(), this.setupNavigation(n));
      } }, { key: "calc", value: function() {
      } }, { key: "updateWidth", value: function() {
        this.baseWidth = getElementContentWidth(this.parent), this.width = this.baseWidth - getExtraWidth(this.measures);
      } }, { key: "makeChartArea", value: function() {
        this.svg && this.container.removeChild(this.svg);
        var t7 = this.measures;
        this.svg = makeSVGContainer(this.container, "frappe-chart chart", this.baseWidth, this.baseHeight), this.svgDefs = makeSVGDefs(this.svg), this.title.length && (this.titleEL = makeText("title", t7.margins.left, t7.margins.top, this.title, { fontSize: t7.titleFontSize, fill: "#666666", dy: t7.titleFontSize }));
        var e = getTopOffset(t7);
        this.drawArea = makeSVGGroup(this.type + "-chart chart-draw-area", "translate(" + getLeftOffset(t7) + ", " + e + ")"), this.config.showLegend && (e += this.height + t7.paddings.bottom, this.legendArea = makeSVGGroup("chart-legend", "translate(" + getLeftOffset(t7) + ", " + e + ")")), this.title.length && this.svg.appendChild(this.titleEL), this.svg.appendChild(this.drawArea), this.config.showLegend && this.svg.appendChild(this.legendArea), this.updateTipOffset(getLeftOffset(t7), getTopOffset(t7));
      } }, { key: "updateTipOffset", value: function(t7, e) {
        this.tip.offset = { x: t7, y: e };
      } }, { key: "setupComponents", value: function() {
        this.components = new Map();
      } }, { key: "update", value: function(t7) {
        t7 || console.error("No data to update."), this.data = this.prepareData(t7), this.calc(), this.render(this.components, this.config.animate), this.renderLegend();
      } }, { key: "render", value: function() {
        var t7 = this, e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.components, n = !(arguments.length > 1 && arguments[1] !== void 0) || arguments[1];
        this.config.isNavigable && this.overlays.map(function(t8) {
          return t8.parentNode.removeChild(t8);
        });
        var i = [];
        e.forEach(function(t8) {
          i = i.concat(t8.update(n));
        }), i.length > 0 ? (runSMILAnimation(this.container, this.svg, i), setTimeout(function() {
          e.forEach(function(t8) {
            return t8.make();
          }), t7.updateNav();
        }, CHART_POST_ANIMATE_TIMEOUT)) : (e.forEach(function(t8) {
          return t8.make();
        }), this.updateNav());
      } }, { key: "updateNav", value: function() {
        this.config.isNavigable && (this.makeOverlay(), this.bindUnits());
      } }, { key: "renderLegend", value: function() {
      } }, { key: "setupNavigation", value: function() {
        var t7 = this, e = arguments.length > 0 && arguments[0] !== void 0 && arguments[0];
        this.config.isNavigable && e && (this.bindOverlay(), this.keyActions = { 13: this.onEnterKey.bind(this), 37: this.onLeftArrow.bind(this), 38: this.onUpArrow.bind(this), 39: this.onRightArrow.bind(this), 40: this.onDownArrow.bind(this) }, document.addEventListener("keydown", function(e2) {
          isElementInViewport(t7.container) && (e2 = e2 || window.event, t7.keyActions[e2.keyCode] && t7.keyActions[e2.keyCode]());
        }));
      } }, { key: "makeOverlay", value: function() {
      } }, { key: "updateOverlay", value: function() {
      } }, { key: "bindOverlay", value: function() {
      } }, { key: "bindUnits", value: function() {
      } }, { key: "onLeftArrow", value: function() {
      } }, { key: "onRightArrow", value: function() {
      } }, { key: "onUpArrow", value: function() {
      } }, { key: "onDownArrow", value: function() {
      } }, { key: "onEnterKey", value: function() {
      } }, { key: "addDataPoint", value: function() {
      } }, { key: "removeDataPoint", value: function() {
      } }, { key: "getDataPoint", value: function() {
      } }, { key: "setCurrentDataPoint", value: function() {
      } }, { key: "updateDataset", value: function() {
      } }, { key: "export", value: function() {
        var t7 = prepareForExport(this.svg);
        downloadFile(this.title || "Chart", [t7]);
      } }]), t6;
    }();
    _createClass$1 = function() {
      function t6(t7, e) {
        for (var n = 0; n < e.length; n++) {
          var i = e[n];
          i.enumerable = i.enumerable || false, i.configurable = true, "value" in i && (i.writable = true), Object.defineProperty(t7, i.key, i);
        }
      }
      return function(e, n, i) {
        return n && t6(e.prototype, n), i && t6(e, i), e;
      };
    }();
    _get$1 = function t(e, n, i) {
      e === null && (e = Function.prototype);
      var a = Object.getOwnPropertyDescriptor(e, n);
      if (a === void 0) {
        var r = Object.getPrototypeOf(e);
        return r === null ? void 0 : t(r, n, i);
      }
      if ("value" in a)
        return a.value;
      var o = a.get;
      if (o !== void 0)
        return o.call(i);
    };
    AggregationChart = function(t6) {
      function e(t7, n) {
        return _classCallCheck$2(this, e), _possibleConstructorReturn$1(this, (e.__proto__ || Object.getPrototypeOf(e)).call(this, t7, n));
      }
      return _inherits$1(e, t6), _createClass$1(e, [{ key: "configure", value: function(t7) {
        _get$1(e.prototype.__proto__ || Object.getPrototypeOf(e.prototype), "configure", this).call(this, t7), this.config.formatTooltipY = (t7.tooltipOptions || {}).formatTooltipY, this.config.maxSlices = t7.maxSlices || 20, this.config.maxLegendPoints = t7.maxLegendPoints || 20;
      } }, { key: "calc", value: function() {
        var t7 = this, e2 = this.state, n = this.config.maxSlices;
        e2.sliceTotals = [];
        var i = this.data.labels.map(function(e3, n2) {
          var i2 = 0;
          return t7.data.datasets.map(function(t8) {
            i2 += t8.values[n2];
          }), [i2, e3];
        }).filter(function(t8) {
          return t8[0] >= 0;
        }), a = i;
        if (i.length > n) {
          i.sort(function(t8, e3) {
            return e3[0] - t8[0];
          }), a = i.slice(0, n - 1);
          var r = 0;
          i.slice(n - 1).map(function(t8) {
            r += t8[0];
          }), a.push([r, "Rest"]), this.colors[n - 1] = "grey";
        }
        e2.labels = [], a.map(function(t8) {
          e2.sliceTotals.push(round(t8[0])), e2.labels.push(t8[1]);
        }), e2.grandTotal = e2.sliceTotals.reduce(function(t8, e3) {
          return t8 + e3;
        }, 0), this.center = { x: this.width / 2, y: this.height / 2 };
      } }, { key: "renderLegend", value: function() {
        var t7 = this, e2 = this.state;
        this.legendArea.textContent = "", this.legendTotals = e2.sliceTotals.slice(0, this.config.maxLegendPoints);
        var n = 0, i = 0;
        this.legendTotals.map(function(a, r) {
          var o = 150, s2 = Math.floor((t7.width - getExtraWidth(t7.measures)) / o);
          t7.legendTotals.length < s2 && (o = t7.width / t7.legendTotals.length), n > s2 && (n = 0, i += 20);
          var l = o * n + 5, u = t7.config.truncateLegends ? truncateString(e2.labels[r], o / 10) : e2.labels[r], c = t7.config.formatTooltipY ? t7.config.formatTooltipY(a) : a, h = legendDot(l, i, 5, t7.colors[r], u + ": " + c, false);
          t7.legendArea.appendChild(h), n++;
        });
      } }]), e;
    }(BaseChart);
    NO_OF_YEAR_MONTHS = 12;
    NO_OF_DAYS_IN_WEEK = 7;
    NO_OF_MILLIS = 1e3;
    SEC_IN_DAY = 86400;
    MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    _slicedToArray$3 = function() {
      function t6(t7, e) {
        var n = [], i = true, a = false, r = void 0;
        try {
          for (var o, s2 = t7[Symbol.iterator](); !(i = (o = s2.next()).done) && (n.push(o.value), !e || n.length !== e); i = true)
            ;
        } catch (t8) {
          a = true, r = t8;
        } finally {
          try {
            !i && s2.return && s2.return();
          } finally {
            if (a)
              throw r;
          }
        }
        return n;
      }
      return function(e, n) {
        if (Array.isArray(e))
          return e;
        if (Symbol.iterator in Object(e))
          return t6(e, n);
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      };
    }();
    _createClass$4 = function() {
      function t6(t7, e) {
        for (var n = 0; n < e.length; n++) {
          var i = e[n];
          i.enumerable = i.enumerable || false, i.configurable = true, "value" in i && (i.writable = true), Object.defineProperty(t7, i.key, i);
        }
      }
      return function(e, n, i) {
        return n && t6(e.prototype, n), i && t6(e, i), e;
      };
    }();
    ChartComponent = function() {
      function t6(e) {
        var n = e.layerClass, i = n === void 0 ? "" : n, a = e.layerTransform, r = a === void 0 ? "" : a, o = e.constants, s2 = e.getData, l = e.makeElements, u = e.animateElements;
        _classCallCheck$5(this, t6), this.layerTransform = r, this.constants = o, this.makeElements = l, this.getData = s2, this.animateElements = u, this.store = [], this.labels = [], this.layerClass = i, this.layerClass = typeof this.layerClass == "function" ? this.layerClass() : this.layerClass, this.refresh();
      }
      return _createClass$4(t6, [{ key: "refresh", value: function(t7) {
        this.data = t7 || this.getData();
      } }, { key: "setup", value: function(t7) {
        this.layer = makeSVGGroup(this.layerClass, this.layerTransform, t7);
      } }, { key: "make", value: function() {
        this.render(this.data), this.oldData = this.data;
      } }, { key: "render", value: function(t7) {
        var e = this;
        this.store = this.makeElements(t7), this.layer.textContent = "", this.store.forEach(function(t8) {
          e.layer.appendChild(t8);
        }), this.labels.forEach(function(t8) {
          e.layer.appendChild(t8);
        });
      } }, { key: "update", value: function() {
        var t7 = !(arguments.length > 0 && arguments[0] !== void 0) || arguments[0];
        this.refresh();
        var e = [];
        return t7 && (e = this.animateElements(this.data) || []), e;
      } }]), t6;
    }();
    componentConfigs = { donutSlices: { layerClass: "donut-slices", makeElements: function(t6) {
      return t6.sliceStrings.map(function(e, n) {
        var i = makePath(e, "donut-path", t6.colors[n], "none", t6.strokeWidth);
        return i.style.transition = "transform .3s;", i;
      });
    }, animateElements: function(t6) {
      return this.store.map(function(e, n) {
        return animatePathStr(e, t6.sliceStrings[n]);
      });
    } }, pieSlices: { layerClass: "pie-slices", makeElements: function(t6) {
      return t6.sliceStrings.map(function(e, n) {
        var i = makePath(e, "pie-path", "none", t6.colors[n]);
        return i.style.transition = "transform .3s;", i;
      });
    }, animateElements: function(t6) {
      return this.store.map(function(e, n) {
        return animatePathStr(e, t6.sliceStrings[n]);
      });
    } }, percentageBars: { layerClass: "percentage-bars", makeElements: function(t6) {
      var e = this;
      return t6.xPositions.map(function(n, i) {
        return percentageBar(n, 0, t6.widths[i], e.constants.barHeight, e.constants.barDepth, t6.colors[i]);
      });
    }, animateElements: function(t6) {
      if (t6)
        return [];
    } }, yAxis: { layerClass: "y axis", makeElements: function(t6) {
      var e = this;
      return t6.positions.map(function(n, i) {
        return yLine(n, t6.labels[i], e.constants.width, { mode: e.constants.mode, pos: e.constants.pos, shortenNumbers: e.constants.shortenNumbers });
      });
    }, animateElements: function(t6) {
      var e = t6.positions, n = t6.labels, i = this.oldData.positions, a = this.oldData.labels, r = equilizeNoOfElements(i, e), o = _slicedToArray$3(r, 2);
      i = o[0], e = o[1];
      var s2 = equilizeNoOfElements(a, n), l = _slicedToArray$3(s2, 2);
      return a = l[0], n = l[1], this.render({ positions: i, labels: n }), this.store.map(function(t7, n2) {
        return translateHoriLine(t7, e[n2], i[n2]);
      });
    } }, xAxis: { layerClass: "x axis", makeElements: function(t6) {
      var e = this;
      return t6.positions.map(function(n, i) {
        return xLine(n, t6.calcLabels[i], e.constants.height, { mode: e.constants.mode, pos: e.constants.pos });
      });
    }, animateElements: function(t6) {
      var e = t6.positions, n = t6.calcLabels, i = this.oldData.positions, a = this.oldData.calcLabels, r = equilizeNoOfElements(i, e), o = _slicedToArray$3(r, 2);
      i = o[0], e = o[1];
      var s2 = equilizeNoOfElements(a, n), l = _slicedToArray$3(s2, 2);
      return a = l[0], n = l[1], this.render({ positions: i, calcLabels: n }), this.store.map(function(t7, n2) {
        return translateVertLine(t7, e[n2], i[n2]);
      });
    } }, yMarkers: { layerClass: "y-markers", makeElements: function(t6) {
      var e = this;
      return t6.map(function(t7) {
        return yMarker(t7.position, t7.label, e.constants.width, { labelPos: t7.options.labelPos, mode: "span", lineType: "dashed" });
      });
    }, animateElements: function(t6) {
      var e = equilizeNoOfElements(this.oldData, t6), n = _slicedToArray$3(e, 2);
      this.oldData = n[0];
      var i = (t6 = n[1]).map(function(t7) {
        return t7.position;
      }), a = t6.map(function(t7) {
        return t7.label;
      }), r = t6.map(function(t7) {
        return t7.options;
      }), o = this.oldData.map(function(t7) {
        return t7.position;
      });
      return this.render(o.map(function(t7, e2) {
        return { position: o[e2], label: a[e2], options: r[e2] };
      })), this.store.map(function(t7, e2) {
        return translateHoriLine(t7, i[e2], o[e2]);
      });
    } }, yRegions: { layerClass: "y-regions", makeElements: function(t6) {
      var e = this;
      return t6.map(function(t7) {
        return yRegion(t7.startPos, t7.endPos, e.constants.width, t7.label, { labelPos: t7.options.labelPos });
      });
    }, animateElements: function(t6) {
      var e = equilizeNoOfElements(this.oldData, t6), n = _slicedToArray$3(e, 2);
      this.oldData = n[0];
      var i = (t6 = n[1]).map(function(t7) {
        return t7.endPos;
      }), a = t6.map(function(t7) {
        return t7.label;
      }), r = t6.map(function(t7) {
        return t7.startPos;
      }), o = t6.map(function(t7) {
        return t7.options;
      }), s2 = this.oldData.map(function(t7) {
        return t7.endPos;
      }), l = this.oldData.map(function(t7) {
        return t7.startPos;
      });
      this.render(s2.map(function(t7, e2) {
        return { startPos: l[e2], endPos: s2[e2], label: a[e2], options: o[e2] };
      }));
      var u = [];
      return this.store.map(function(t7, e2) {
        u = u.concat(animateRegion(t7, r[e2], i[e2], s2[e2]));
      }), u;
    } }, heatDomain: { layerClass: function() {
      return "heat-domain domain-" + this.constants.index;
    }, makeElements: function(t6) {
      var e = this, n = this.constants, i = n.index, a = n.colWidth, r = n.rowHeight, o = n.squareSize, s2 = n.radius, l = n.xTranslate, u = 0;
      return this.serializedSubDomains = [], t6.cols.map(function(t7, n2) {
        n2 === 1 && e.labels.push(makeText("domain-name", l, -12, getMonthName(i, true).toUpperCase(), { fontSize: 9 })), t7.map(function(t8, n3) {
          if (t8.fill) {
            var i2 = { "data-date": t8.yyyyMmDd, "data-value": t8.dataValue, "data-day": n3 }, a2 = heatSquare("day", l, u, o, s2, t8.fill, i2);
            e.serializedSubDomains.push(a2);
          }
          u += r;
        }), u = 0, l += a;
      }), this.serializedSubDomains;
    }, animateElements: function(t6) {
      if (t6)
        return [];
    } }, barGraph: { layerClass: function() {
      return "dataset-units dataset-bars dataset-" + this.constants.index;
    }, makeElements: function(t6) {
      var e = this.constants;
      return this.unitType = "bar", this.units = t6.yPositions.map(function(n, i) {
        return datasetBar(t6.xPositions[i], n, t6.barWidth, e.color, t6.labels[i], i, t6.offsets[i], { zeroLine: t6.zeroLine, barsWidth: t6.barsWidth, minHeight: e.minHeight });
      }), this.units;
    }, animateElements: function(t6) {
      var e = t6.xPositions, n = t6.yPositions, i = t6.offsets, a = t6.labels, r = this.oldData.xPositions, o = this.oldData.yPositions, s2 = this.oldData.offsets, l = this.oldData.labels, u = equilizeNoOfElements(r, e), c = _slicedToArray$3(u, 2);
      r = c[0], e = c[1];
      var h = equilizeNoOfElements(o, n), d2 = _slicedToArray$3(h, 2);
      o = d2[0], n = d2[1];
      var f = equilizeNoOfElements(s2, i), p = _slicedToArray$3(f, 2);
      s2 = p[0], i = p[1];
      var v = equilizeNoOfElements(l, a), g = _slicedToArray$3(v, 2);
      l = g[0], a = g[1], this.render({ xPositions: r, yPositions: o, offsets: s2, labels: a, zeroLine: this.oldData.zeroLine, barsWidth: this.oldData.barsWidth, barWidth: this.oldData.barWidth });
      var y = [];
      return this.store.map(function(a2, r2) {
        y = y.concat(animateBar(a2, e[r2], n[r2], t6.barWidth, i[r2], { zeroLine: t6.zeroLine }));
      }), y;
    } }, lineGraph: { layerClass: function() {
      return "dataset-units dataset-line dataset-" + this.constants.index;
    }, makeElements: function(t6) {
      var e = this.constants;
      return this.unitType = "dot", this.paths = {}, e.hideLine || (this.paths = getPaths(t6.xPositions, t6.yPositions, e.color, { heatline: e.heatline, regionFill: e.regionFill, spline: e.spline }, { svgDefs: e.svgDefs, zeroLine: t6.zeroLine })), this.units = [], e.hideDots || (this.units = t6.yPositions.map(function(n, i) {
        return datasetDot(t6.xPositions[i], n, t6.radius, e.color, e.valuesOverPoints ? t6.values[i] : "", i);
      })), Object.values(this.paths).concat(this.units);
    }, animateElements: function(t6) {
      var e = t6.xPositions, n = t6.yPositions, i = t6.values, a = this.oldData.xPositions, r = this.oldData.yPositions, o = this.oldData.values, s2 = equilizeNoOfElements(a, e), l = _slicedToArray$3(s2, 2);
      a = l[0], e = l[1];
      var u = equilizeNoOfElements(r, n), c = _slicedToArray$3(u, 2);
      r = c[0], n = c[1];
      var h = equilizeNoOfElements(o, i), d2 = _slicedToArray$3(h, 2);
      o = d2[0], i = d2[1], this.render({ xPositions: a, yPositions: r, values: i, zeroLine: this.oldData.zeroLine, radius: this.oldData.radius });
      var f = [];
      return Object.keys(this.paths).length && (f = f.concat(animatePath(this.paths, e, n, t6.zeroLine, this.constants.spline))), this.units.length && this.units.map(function(t7, i2) {
        f = f.concat(animateDot(t7, e[i2], n[i2]));
      }), f;
    } } };
    _createClass = function() {
      function t6(t7, e) {
        for (var n = 0; n < e.length; n++) {
          var i = e[n];
          i.enumerable = i.enumerable || false, i.configurable = true, "value" in i && (i.writable = true), Object.defineProperty(t7, i.key, i);
        }
      }
      return function(e, n, i) {
        return n && t6(e.prototype, n), i && t6(e, i), e;
      };
    }();
    _get = function t2(e, n, i) {
      e === null && (e = Function.prototype);
      var a = Object.getOwnPropertyDescriptor(e, n);
      if (a === void 0) {
        var r = Object.getPrototypeOf(e);
        return r === null ? void 0 : t2(r, n, i);
      }
      if ("value" in a)
        return a.value;
      var o = a.get;
      if (o !== void 0)
        return o.call(i);
    };
    (function(t6) {
      function e(t7, n) {
        _classCallCheck$1(this, e);
        var i = _possibleConstructorReturn(this, (e.__proto__ || Object.getPrototypeOf(e)).call(this, t7, n));
        return i.type = "percentage", i.setup(), i;
      }
      return _inherits(e, t6), _createClass(e, [{ key: "setMeasures", value: function(t7) {
        var e2 = this.measures;
        this.barOptions = t7.barOptions || {};
        var n = this.barOptions;
        n.height = n.height || PERCENTAGE_BAR_DEFAULT_HEIGHT, n.depth = n.depth || PERCENTAGE_BAR_DEFAULT_DEPTH, e2.paddings.right = 30, e2.legendHeight = 60, e2.baseHeight = 8 * (n.height + 0.5 * n.depth);
      } }, { key: "setupComponents", value: function() {
        var t7 = this.state, e2 = [["percentageBars", { barHeight: this.barOptions.height, barDepth: this.barOptions.depth }, function() {
          return { xPositions: t7.xPositions, widths: t7.widths, colors: this.colors };
        }.bind(this)]];
        this.components = new Map(e2.map(function(t8) {
          var e3 = getComponent.apply(void 0, _toConsumableArray(t8));
          return [t8[0], e3];
        }));
      } }, { key: "calc", value: function() {
        var t7 = this;
        _get(e.prototype.__proto__ || Object.getPrototypeOf(e.prototype), "calc", this).call(this);
        var n = this.state;
        n.xPositions = [], n.widths = [];
        var i = 0;
        n.sliceTotals.map(function(e2) {
          var a = t7.width * e2 / n.grandTotal;
          n.widths.push(a), n.xPositions.push(i), i += a;
        });
      } }, { key: "makeDataByIndex", value: function() {
      } }, { key: "bindTooltip", value: function() {
        var t7 = this, e2 = this.state;
        this.container.addEventListener("mousemove", function(n) {
          var i = t7.components.get("percentageBars").store, a = n.target;
          if (i.includes(a)) {
            var r = i.indexOf(a), o = getOffset(t7.container), s2 = getOffset(a), l = s2.left - o.left + parseInt(a.getAttribute("width")) / 2, u = s2.top - o.top, c = (t7.formattedLabels && t7.formattedLabels.length > 0 ? t7.formattedLabels[r] : t7.state.labels[r]) + ": ", h = e2.sliceTotals[r] / e2.grandTotal;
            t7.tip.setValues(l, u, { name: c, value: (100 * h).toFixed(1) + "%" }), t7.tip.showTip();
          }
        });
      } }]), e;
    })(AggregationChart);
    _createClass$5 = function() {
      function t6(t7, e) {
        for (var n = 0; n < e.length; n++) {
          var i = e[n];
          i.enumerable = i.enumerable || false, i.configurable = true, "value" in i && (i.writable = true), Object.defineProperty(t7, i.key, i);
        }
      }
      return function(e, n, i) {
        return n && t6(e.prototype, n), i && t6(e, i), e;
      };
    }();
    _get$2 = function t3(e, n, i) {
      e === null && (e = Function.prototype);
      var a = Object.getOwnPropertyDescriptor(e, n);
      if (a === void 0) {
        var r = Object.getPrototypeOf(e);
        return r === null ? void 0 : t3(r, n, i);
      }
      if ("value" in a)
        return a.value;
      var o = a.get;
      if (o !== void 0)
        return o.call(i);
    };
    (function(t6) {
      function e(t7, n) {
        _classCallCheck$6(this, e);
        var i = _possibleConstructorReturn$2(this, (e.__proto__ || Object.getPrototypeOf(e)).call(this, t7, n));
        return i.type = "pie", i.initTimeout = 0, i.init = 1, i.setup(), i;
      }
      return _inherits$2(e, t6), _createClass$5(e, [{ key: "configure", value: function(t7) {
        _get$2(e.prototype.__proto__ || Object.getPrototypeOf(e.prototype), "configure", this).call(this, t7), this.mouseMove = this.mouseMove.bind(this), this.mouseLeave = this.mouseLeave.bind(this), this.hoverRadio = t7.hoverRadio || 0.1, this.config.startAngle = t7.startAngle || 0, this.clockWise = t7.clockWise || false;
      } }, { key: "calc", value: function() {
        var t7 = this;
        _get$2(e.prototype.__proto__ || Object.getPrototypeOf(e.prototype), "calc", this).call(this);
        var n = this.state;
        this.radius = this.height > this.width ? this.center.x : this.center.y;
        var i = this.radius, a = this.clockWise, r = n.slicesProperties || [];
        n.sliceStrings = [], n.slicesProperties = [];
        var o = 180 - this.config.startAngle;
        n.sliceTotals.map(function(e2, s2) {
          var l = o, u = e2 / n.grandTotal * FULL_ANGLE, c = u > 180 ? 1 : 0, h = a ? -u : u, d2 = o += h, f = getPositionByAngle(l, i), p = getPositionByAngle(d2, i), v = t7.init && r[s2], g = void 0, y = void 0;
          t7.init ? (g = v ? v.startPosition : f, y = v ? v.endPosition : f) : (g = f, y = p);
          var m = u === 360 ? makeCircleStr(g, y, t7.center, t7.radius, a, c) : makeArcPathStr(g, y, t7.center, t7.radius, a, c);
          n.sliceStrings.push(m), n.slicesProperties.push({ startPosition: f, endPosition: p, value: e2, total: n.grandTotal, startAngle: l, endAngle: d2, angle: h });
        }), this.init = 0;
      } }, { key: "setupComponents", value: function() {
        var t7 = this.state, e2 = [["pieSlices", {}, function() {
          return { sliceStrings: t7.sliceStrings, colors: this.colors };
        }.bind(this)]];
        this.components = new Map(e2.map(function(t8) {
          var e3 = getComponent.apply(void 0, _toConsumableArray$2(t8));
          return [t8[0], e3];
        }));
      } }, { key: "calTranslateByAngle", value: function(t7) {
        var e2 = this.radius, n = this.hoverRadio, i = getPositionByAngle(t7.startAngle + t7.angle / 2, e2);
        return "translate3d(" + i.x * n + "px," + i.y * n + "px,0)";
      } }, { key: "hoverSlice", value: function(t7, e2, n, i) {
        if (t7) {
          var a = this.colors[e2];
          if (n) {
            transform(t7, this.calTranslateByAngle(this.state.slicesProperties[e2])), t7.style.fill = lightenDarkenColor(a, 50);
            var r = getOffset(this.svg), o = i.pageX - r.left + 10, s2 = i.pageY - r.top - 10, l = (this.formatted_labels && this.formatted_labels.length > 0 ? this.formatted_labels[e2] : this.state.labels[e2]) + ": ", u = (100 * this.state.sliceTotals[e2] / this.state.grandTotal).toFixed(1);
            this.tip.setValues(o, s2, { name: l, value: u + "%" }), this.tip.showTip();
          } else
            transform(t7, "translate3d(0,0,0)"), this.tip.hideTip(), t7.style.fill = a;
        }
      } }, { key: "bindTooltip", value: function() {
        this.container.addEventListener("mousemove", this.mouseMove), this.container.addEventListener("mouseleave", this.mouseLeave);
      } }, { key: "mouseMove", value: function(t7) {
        var e2 = t7.target, n = this.components.get("pieSlices").store, i = this.curActiveSliceIndex, a = this.curActiveSlice;
        if (n.includes(e2)) {
          var r = n.indexOf(e2);
          this.hoverSlice(a, i, false), this.curActiveSlice = e2, this.curActiveSliceIndex = r, this.hoverSlice(e2, r, true, t7);
        } else
          this.mouseLeave();
      } }, { key: "mouseLeave", value: function() {
        this.hoverSlice(this.curActiveSlice, this.curActiveSliceIndex, false);
      } }]), e;
    })(AggregationChart);
    _slicedToArray$4 = function() {
      function t6(t7, e) {
        var n = [], i = true, a = false, r = void 0;
        try {
          for (var o, s2 = t7[Symbol.iterator](); !(i = (o = s2.next()).done) && (n.push(o.value), !e || n.length !== e); i = true)
            ;
        } catch (t8) {
          a = true, r = t8;
        } finally {
          try {
            !i && s2.return && s2.return();
          } finally {
            if (a)
              throw r;
          }
        }
        return n;
      }
      return function(e, n) {
        if (Array.isArray(e))
          return e;
        if (Symbol.iterator in Object(e))
          return t6(e, n);
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      };
    }();
    _createClass$6 = function() {
      function t6(t7, e) {
        for (var n = 0; n < e.length; n++) {
          var i = e[n];
          i.enumerable = i.enumerable || false, i.configurable = true, "value" in i && (i.writable = true), Object.defineProperty(t7, i.key, i);
        }
      }
      return function(e, n, i) {
        return n && t6(e.prototype, n), i && t6(e, i), e;
      };
    }();
    COL_WIDTH = HEATMAP_SQUARE_SIZE + HEATMAP_GUTTER_SIZE;
    ROW_HEIGHT = COL_WIDTH;
    (function(t6) {
      function e(t7, n) {
        _classCallCheck$7(this, e);
        var i = _possibleConstructorReturn$3(this, (e.__proto__ || Object.getPrototypeOf(e)).call(this, t7, n));
        i.type = "heatmap", i.countLabel = n.countLabel || "";
        var a = ["Sunday", "Monday"], r = a.includes(n.startSubDomain) ? n.startSubDomain : "Sunday";
        return i.startSubDomainIndex = a.indexOf(r), i.setup(), i;
      }
      return _inherits$3(e, t6), _createClass$6(e, [{ key: "setMeasures", value: function(t7) {
        var e2 = this.measures;
        this.discreteDomains = t7.discreteDomains === 0 ? 0 : 1, e2.paddings.top = 3 * ROW_HEIGHT, e2.paddings.bottom = 0, e2.legendHeight = 2 * ROW_HEIGHT, e2.baseHeight = ROW_HEIGHT * NO_OF_DAYS_IN_WEEK + getExtraHeight(e2);
        var n = this.data, i = this.discreteDomains ? NO_OF_YEAR_MONTHS : 0;
        this.independentWidth = (getWeeksBetween(n.start, n.end) + i) * COL_WIDTH + getExtraWidth(e2);
      } }, { key: "updateWidth", value: function() {
        var t7 = this.discreteDomains ? NO_OF_YEAR_MONTHS : 0, e2 = this.state.noOfWeeks ? this.state.noOfWeeks : 52;
        this.baseWidth = (e2 + t7) * COL_WIDTH + getExtraWidth(this.measures);
      } }, { key: "prepareData", value: function() {
        var t7 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.data;
        if (t7.start && t7.end && t7.start > t7.end)
          throw new Error("Start date cannot be greater than end date.");
        if (t7.start || (t7.start = new Date(), t7.start.setFullYear(t7.start.getFullYear() - 1)), t7.end || (t7.end = new Date()), t7.dataPoints = t7.dataPoints || {}, parseInt(Object.keys(t7.dataPoints)[0]) > 1e5) {
          var e2 = {};
          Object.keys(t7.dataPoints).forEach(function(n) {
            var i = new Date(n * NO_OF_MILLIS);
            e2[getYyyyMmDd(i)] = t7.dataPoints[n];
          }), t7.dataPoints = e2;
        }
        return t7;
      } }, { key: "calc", value: function() {
        var t7 = this.state;
        t7.start = clone2(this.data.start), t7.end = clone2(this.data.end), t7.firstWeekStart = clone2(t7.start), t7.noOfWeeks = getWeeksBetween(t7.start, t7.end), t7.distribution = calcDistribution(Object.values(this.data.dataPoints), HEATMAP_DISTRIBUTION_SIZE), t7.domainConfigs = this.getDomains();
      } }, { key: "setupComponents", value: function() {
        var t7 = this, e2 = this.state, n = this.discreteDomains ? 0 : 1, i = e2.domainConfigs.map(function(i2, a2) {
          return ["heatDomain", { index: i2.index, colWidth: COL_WIDTH, rowHeight: ROW_HEIGHT, squareSize: HEATMAP_SQUARE_SIZE, radius: t7.rawChartArgs.radius || 0, xTranslate: e2.domainConfigs.filter(function(t8, e3) {
            return e3 < a2;
          }).map(function(t8) {
            return t8.cols.length - n;
          }).reduce(function(t8, e3) {
            return t8 + e3;
          }, 0) * COL_WIDTH }, function() {
            return e2.domainConfigs[a2];
          }.bind(t7)];
        });
        this.components = new Map(i.map(function(t8, e3) {
          var n2 = getComponent.apply(void 0, _toConsumableArray$3(t8));
          return [t8[0] + "-" + e3, n2];
        }));
        var a = 0;
        DAY_NAMES_SHORT.forEach(function(e3, n2) {
          if ([1, 3, 5].includes(n2)) {
            var i2 = makeText("subdomain-name", -COL_WIDTH / 2, a, e3, { fontSize: HEATMAP_SQUARE_SIZE, dy: 8, textAnchor: "end" });
            t7.drawArea.appendChild(i2);
          }
          a += ROW_HEIGHT;
        });
      } }, { key: "update", value: function(t7) {
        t7 || console.error("No data to update."), this.data = this.prepareData(t7), this.draw(), this.bindTooltip();
      } }, { key: "bindTooltip", value: function() {
        var t7 = this;
        this.container.addEventListener("mousemove", function(e2) {
          t7.components.forEach(function(n) {
            var i = n.store, a = e2.target;
            if (i.includes(a)) {
              var r = a.getAttribute("data-value"), o = a.getAttribute("data-date").split("-"), s2 = getMonthName(parseInt(o[1]) - 1, true), l = t7.container.getBoundingClientRect(), u = a.getBoundingClientRect(), c = parseInt(e2.target.getAttribute("width")), h = u.left - l.left + c / 2, d2 = u.top - l.top, f = r + " " + t7.countLabel, p = " on " + s2 + " " + o[0] + ", " + o[2];
              t7.tip.setValues(h, d2, { name: p, value: f, valueFirst: 1 }, []), t7.tip.showTip();
            }
          });
        });
      } }, { key: "renderLegend", value: function() {
        var t7 = this;
        this.legendArea.textContent = "";
        var e2 = 0, n = ROW_HEIGHT, i = this.rawChartArgs.radius || 0, a = makeText("subdomain-name", e2, n, "Less", { fontSize: HEATMAP_SQUARE_SIZE + 1, dy: 9 });
        e2 = 2 * COL_WIDTH + COL_WIDTH / 2, this.legendArea.appendChild(a), this.colors.slice(0, HEATMAP_DISTRIBUTION_SIZE).map(function(a2, r2) {
          var o = heatSquare("heatmap-legend-unit", e2 + (COL_WIDTH + 3) * r2, n, HEATMAP_SQUARE_SIZE, i, a2);
          t7.legendArea.appendChild(o);
        });
        var r = makeText("subdomain-name", e2 + HEATMAP_DISTRIBUTION_SIZE * (COL_WIDTH + 3) + COL_WIDTH / 4, n, "More", { fontSize: HEATMAP_SQUARE_SIZE + 1, dy: 9 });
        this.legendArea.appendChild(r);
      } }, { key: "getDomains", value: function() {
        for (var t7 = this.state, e2 = [t7.start.getMonth(), t7.start.getFullYear()], n = e2[0], i = e2[1], a = [t7.end.getMonth(), t7.end.getFullYear()], r = a[0] - n + 1 + 12 * (a[1] - i), o = [], s2 = clone2(t7.start), l = 0; l < r; l++) {
          var u = t7.end;
          if (!areInSameMonth(s2, t7.end)) {
            var c = [s2.getMonth(), s2.getFullYear()];
            u = getLastDateInMonth(c[0], c[1]);
          }
          o.push(this.getDomainConfig(s2, u)), addDays(u, 1), s2 = u;
        }
        return o;
      } }, { key: "getDomainConfig", value: function(t7) {
        var e2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "", n = [t7.getMonth(), t7.getFullYear()], i = n[0], a = n[1], r = setDayToSunday(t7), o = { index: i, cols: [] };
        addDays(e2 = clone2(e2) || getLastDateInMonth(i, a), 1);
        for (var s2 = getWeeksBetween(r, e2), l = [], u = void 0, c = 0; c < s2; c++)
          u = this.getCol(r, i), l.push(u), addDays(r = new Date(u[NO_OF_DAYS_IN_WEEK - 1].yyyyMmDd), 1);
        return u[NO_OF_DAYS_IN_WEEK - 1].dataValue !== void 0 && (addDays(r, 1), l.push(this.getCol(r, i, true))), o.cols = l, o;
      } }, { key: "getCol", value: function(t7, e2) {
        for (var n = arguments.length > 2 && arguments[2] !== void 0 && arguments[2], i = this.state, a = clone2(t7), r = [], o = 0; o < NO_OF_DAYS_IN_WEEK; o++, addDays(a, 1)) {
          var s2 = {}, l = a >= i.start && a <= i.end;
          n || a.getMonth() !== e2 || !l ? s2.yyyyMmDd = getYyyyMmDd(a) : s2 = this.getSubDomainConfig(a), r.push(s2);
        }
        return r;
      } }, { key: "getSubDomainConfig", value: function(t7) {
        var e2 = getYyyyMmDd(t7), n = this.data.dataPoints[e2];
        return { yyyyMmDd: e2, dataValue: n || 0, fill: this.colors[getMaxCheckpoint(n, this.state.distribution)] };
      } }]), e;
    })(BaseChart);
    _createClass$7 = function() {
      function t6(t7, e) {
        for (var n = 0; n < e.length; n++) {
          var i = e[n];
          i.enumerable = i.enumerable || false, i.configurable = true, "value" in i && (i.writable = true), Object.defineProperty(t7, i.key, i);
        }
      }
      return function(e, n, i) {
        return n && t6(e.prototype, n), i && t6(e, i), e;
      };
    }();
    _get$3 = function t4(e, n, i) {
      e === null && (e = Function.prototype);
      var a = Object.getOwnPropertyDescriptor(e, n);
      if (a === void 0) {
        var r = Object.getPrototypeOf(e);
        return r === null ? void 0 : t4(r, n, i);
      }
      if ("value" in a)
        return a.value;
      var o = a.get;
      if (o !== void 0)
        return o.call(i);
    };
    (function(t6) {
      function e(t7, n) {
        _classCallCheck$8(this, e);
        var i = _possibleConstructorReturn$4(this, (e.__proto__ || Object.getPrototypeOf(e)).call(this, t7, n));
        return i.barOptions = n.barOptions || {}, i.lineOptions = n.lineOptions || {}, i.type = n.type || "line", i.init = 1, i.setup(), i;
      }
      return _inherits$4(e, t6), _createClass$7(e, [{ key: "setMeasures", value: function() {
        this.data.datasets.length <= 1 && (this.config.showLegend = 0, this.measures.paddings.bottom = 30);
      } }, { key: "configure", value: function(t7) {
        _get$3(e.prototype.__proto__ || Object.getPrototypeOf(e.prototype), "configure", this).call(this, t7), t7.axisOptions = t7.axisOptions || {}, t7.tooltipOptions = t7.tooltipOptions || {}, this.config.xAxisMode = t7.axisOptions.xAxisMode || "span", this.config.yAxisMode = t7.axisOptions.yAxisMode || "span", this.config.xIsSeries = t7.axisOptions.xIsSeries || 0, this.config.shortenYAxisNumbers = t7.axisOptions.shortenYAxisNumbers || 0, this.config.formatTooltipX = t7.tooltipOptions.formatTooltipX, this.config.formatTooltipY = t7.tooltipOptions.formatTooltipY, this.config.valuesOverPoints = t7.valuesOverPoints;
      } }, { key: "prepareData", value: function() {
        return dataPrep(arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.data, this.type);
      } }, { key: "prepareFirstData", value: function() {
        return zeroDataPrep(arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.data);
      } }, { key: "calc", value: function() {
        var t7 = arguments.length > 0 && arguments[0] !== void 0 && arguments[0];
        this.calcXPositions(), t7 || this.calcYAxisParameters(this.getAllYValues(), this.type === "line"), this.makeDataByIndex();
      } }, { key: "calcXPositions", value: function() {
        var t7 = this.state, e2 = this.data.labels;
        t7.datasetLength = e2.length, t7.unitWidth = this.width / t7.datasetLength, t7.xOffset = t7.unitWidth / 2, t7.xAxis = { labels: e2, positions: e2.map(function(e3, n) {
          return floatTwo(t7.xOffset + n * t7.unitWidth);
        }) };
      } }, { key: "calcYAxisParameters", value: function(t7) {
        var e2 = calcChartIntervals(t7, arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "false"), n = this.height / getValueRange(e2), i = getIntervalSize(e2) * n, a = this.height - getZeroIndex(e2) * i;
        this.state.yAxis = { labels: e2, positions: e2.map(function(t8) {
          return a - t8 * n;
        }), scaleMultiplier: n, zeroLine: a }, this.calcDatasetPoints(), this.calcYExtremes(), this.calcYRegions();
      } }, { key: "calcDatasetPoints", value: function() {
        var t7 = this.state, e2 = function(e3) {
          return e3.map(function(e4) {
            return scale(e4, t7.yAxis);
          });
        };
        t7.datasets = this.data.datasets.map(function(t8, n) {
          var i = t8.values, a = t8.cumulativeYs || [];
          return { name: t8.name && t8.name.replace(/<|>|&/g, function(t9) {
            return t9 == "&" ? "&amp;" : t9 == "<" ? "&lt;" : "&gt;";
          }), index: n, chartType: t8.chartType, values: i, yPositions: e2(i), cumulativeYs: a, cumulativeYPos: e2(a) };
        });
      } }, { key: "calcYExtremes", value: function() {
        var t7 = this.state;
        if (this.barOptions.stacked)
          return void (t7.yExtremes = t7.datasets[t7.datasets.length - 1].cumulativeYPos);
        t7.yExtremes = new Array(t7.datasetLength).fill(9999), t7.datasets.map(function(e2) {
          e2.yPositions.map(function(e3, n) {
            e3 < t7.yExtremes[n] && (t7.yExtremes[n] = e3);
          });
        });
      } }, { key: "calcYRegions", value: function() {
        var t7 = this.state;
        this.data.yMarkers && (this.state.yMarkers = this.data.yMarkers.map(function(e2) {
          return e2.position = scale(e2.value, t7.yAxis), e2.options || (e2.options = {}), e2;
        })), this.data.yRegions && (this.state.yRegions = this.data.yRegions.map(function(e2) {
          return e2.startPos = scale(e2.start, t7.yAxis), e2.endPos = scale(e2.end, t7.yAxis), e2.options || (e2.options = {}), e2;
        }));
      } }, { key: "getAllYValues", value: function() {
        var t7, e2 = this, n = "values";
        if (this.barOptions.stacked) {
          n = "cumulativeYs";
          var i = new Array(this.state.datasetLength).fill(0);
          this.data.datasets.map(function(t8, a2) {
            var r = e2.data.datasets[a2].values;
            t8[n] = i = i.map(function(t9, e3) {
              return t9 + r[e3];
            });
          });
        }
        var a = this.data.datasets.map(function(t8) {
          return t8[n];
        });
        return this.data.yMarkers && a.push(this.data.yMarkers.map(function(t8) {
          return t8.value;
        })), this.data.yRegions && this.data.yRegions.map(function(t8) {
          a.push([t8.end, t8.start]);
        }), (t7 = []).concat.apply(t7, _toConsumableArray$5(a));
      } }, { key: "setupComponents", value: function() {
        var t7 = this, e2 = [["yAxis", { mode: this.config.yAxisMode, width: this.width, shortenNumbers: this.config.shortenYAxisNumbers }, function() {
          return this.state.yAxis;
        }.bind(this)], ["xAxis", { mode: this.config.xAxisMode, height: this.height }, function() {
          var t8 = this.state;
          return t8.xAxis.calcLabels = getShortenedLabels(this.width, t8.xAxis.labels, this.config.xIsSeries), t8.xAxis;
        }.bind(this)], ["yRegions", { width: this.width, pos: "right" }, function() {
          return this.state.yRegions;
        }.bind(this)]], n = this.state.datasets.filter(function(t8) {
          return t8.chartType === "bar";
        }), i = this.state.datasets.filter(function(t8) {
          return t8.chartType === "line";
        }), a = n.map(function(e3) {
          var i2 = e3.index;
          return ["barGraph-" + e3.index, { index: i2, color: t7.colors[i2], stacked: t7.barOptions.stacked, valuesOverPoints: t7.config.valuesOverPoints, minHeight: t7.height * MIN_BAR_PERCENT_HEIGHT }, function() {
            var t8 = this.state, e4 = t8.datasets[i2], a2 = this.barOptions.stacked, r2 = this.barOptions.spaceRatio || BAR_CHART_SPACE_RATIO, o2 = t8.unitWidth * (1 - r2), s22 = o2 / (a2 ? 1 : n.length), l = t8.xAxis.positions.map(function(t9) {
              return t9 - o2 / 2;
            });
            a2 || (l = l.map(function(t9) {
              return t9 + s22 * i2;
            }));
            var u = new Array(t8.datasetLength).fill("");
            this.config.valuesOverPoints && (u = a2 && e4.index === t8.datasets.length - 1 ? e4.cumulativeYs : e4.values);
            var c = new Array(t8.datasetLength).fill(0);
            return a2 && (c = e4.yPositions.map(function(t9, n2) {
              return t9 - e4.cumulativeYPos[n2];
            })), { xPositions: l, yPositions: e4.yPositions, offsets: c, labels: u, zeroLine: t8.yAxis.zeroLine, barsWidth: o2, barWidth: s22 };
          }.bind(t7)];
        }), r = i.map(function(e3) {
          var n2 = e3.index;
          return ["lineGraph-" + e3.index, { index: n2, color: t7.colors[n2], svgDefs: t7.svgDefs, heatline: t7.lineOptions.heatline, regionFill: t7.lineOptions.regionFill, spline: t7.lineOptions.spline, hideDots: t7.lineOptions.hideDots, hideLine: t7.lineOptions.hideLine, valuesOverPoints: t7.config.valuesOverPoints }, function() {
            var t8 = this.state, e4 = t8.datasets[n2], i2 = t8.yAxis.positions[0] < t8.yAxis.zeroLine ? t8.yAxis.positions[0] : t8.yAxis.zeroLine;
            return { xPositions: t8.xAxis.positions, yPositions: e4.yPositions, values: e4.values, zeroLine: i2, radius: this.lineOptions.dotSize || LINE_CHART_DOT_SIZE };
          }.bind(t7)];
        }), o = [["yMarkers", { width: this.width, pos: "right" }, function() {
          return this.state.yMarkers;
        }.bind(this)]];
        e2 = e2.concat(a, r, o);
        var s2 = ["yMarkers", "yRegions"];
        this.dataUnitComponents = [], this.components = new Map(e2.filter(function(e3) {
          return !s2.includes(e3[0]) || t7.state[e3[0]];
        }).map(function(e3) {
          var n2 = getComponent.apply(void 0, _toConsumableArray$5(e3));
          return (e3[0].includes("lineGraph") || e3[0].includes("barGraph")) && t7.dataUnitComponents.push(n2), [e3[0], n2];
        }));
      } }, { key: "makeDataByIndex", value: function() {
        var t7 = this;
        this.dataByIndex = {};
        var e2 = this.state, n = this.config.formatTooltipX, i = this.config.formatTooltipY;
        e2.xAxis.labels.map(function(a, r) {
          var o = t7.state.datasets.map(function(e3, n2) {
            var a2 = e3.values[r];
            return { title: e3.name, value: a2, yPos: e3.yPositions[r], color: t7.colors[n2], formatted: i ? i(a2) : a2 };
          });
          t7.dataByIndex[r] = { label: a, formattedLabel: n ? n(a) : a, xPos: e2.xAxis.positions[r], values: o, yExtreme: e2.yExtremes[r] };
        });
      } }, { key: "bindTooltip", value: function() {
        var t7 = this;
        this.container.addEventListener("mousemove", function(e2) {
          var n = t7.measures, i = getOffset(t7.container), a = e2.pageX - i.left - getLeftOffset(n), r = e2.pageY - i.top;
          r < t7.height + getTopOffset(n) && r > getTopOffset(n) ? t7.mapTooltipXPosition(a) : t7.tip.hideTip();
        });
      } }, { key: "mapTooltipXPosition", value: function(t7) {
        var e2 = this.state;
        if (e2.yExtremes) {
          var n = getClosestInArray(t7, e2.xAxis.positions, true);
          if (n >= 0) {
            var i = this.dataByIndex[n];
            this.tip.setValues(i.xPos + this.tip.offset.x, i.yExtreme + this.tip.offset.y, { name: i.formattedLabel, value: "" }, i.values, n), this.tip.showTip();
          }
        }
      } }, { key: "renderLegend", value: function() {
        var t7 = this, e2 = this.data;
        e2.datasets.length > 1 && (this.legendArea.textContent = "", e2.datasets.map(function(e3, n) {
          var i = AXIS_LEGEND_BAR_SIZE, a = legendBar(i * n, "0", i, t7.colors[n], e3.name, t7.config.truncateLegends);
          t7.legendArea.appendChild(a);
        }));
      } }, { key: "makeOverlay", value: function() {
        var t7 = this;
        if (this.init)
          return void (this.init = 0);
        this.overlayGuides && this.overlayGuides.forEach(function(t8) {
          var e2 = t8.overlay;
          e2.parentNode.removeChild(e2);
        }), this.overlayGuides = this.dataUnitComponents.map(function(t8) {
          return { type: t8.unitType, overlay: void 0, units: t8.units };
        }), this.state.currentIndex === void 0 && (this.state.currentIndex = this.state.datasetLength - 1), this.overlayGuides.map(function(e2) {
          var n = e2.units[t7.state.currentIndex];
          e2.overlay = makeOverlay[e2.type](n), t7.drawArea.appendChild(e2.overlay);
        });
      } }, { key: "updateOverlayGuides", value: function() {
        this.overlayGuides && this.overlayGuides.forEach(function(t7) {
          var e2 = t7.overlay;
          e2.parentNode.removeChild(e2);
        });
      } }, { key: "bindOverlay", value: function() {
        var t7 = this;
        this.parent.addEventListener("data-select", function() {
          t7.updateOverlay();
        });
      } }, { key: "bindUnits", value: function() {
        var t7 = this;
        this.dataUnitComponents.map(function(e2) {
          e2.units.map(function(e3) {
            e3.addEventListener("click", function() {
              var n = e3.getAttribute("data-point-index");
              t7.setCurrentDataPoint(n);
            });
          });
        }), this.tip.container.addEventListener("click", function() {
          var e2 = t7.tip.container.getAttribute("data-point-index");
          t7.setCurrentDataPoint(e2);
        });
      } }, { key: "updateOverlay", value: function() {
        var t7 = this;
        this.overlayGuides.map(function(e2) {
          var n = e2.units[t7.state.currentIndex];
          updateOverlay[e2.type](n, e2.overlay);
        });
      } }, { key: "onLeftArrow", value: function() {
        this.setCurrentDataPoint(this.state.currentIndex - 1);
      } }, { key: "onRightArrow", value: function() {
        this.setCurrentDataPoint(this.state.currentIndex + 1);
      } }, { key: "getDataPoint", value: function() {
        var t7 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.state.currentIndex, e2 = this.state;
        return { index: t7, label: e2.xAxis.labels[t7], values: e2.datasets.map(function(e3) {
          return e3.values[t7];
        }) };
      } }, { key: "setCurrentDataPoint", value: function(t7) {
        var e2 = this.state;
        (t7 = parseInt(t7)) < 0 && (t7 = 0), t7 >= e2.xAxis.labels.length && (t7 = e2.xAxis.labels.length - 1), t7 !== e2.currentIndex && (e2.currentIndex = t7, fire(this.parent, "data-select", this.getDataPoint()));
      } }, { key: "addDataPoint", value: function(t7, n) {
        var i = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : this.state.datasetLength;
        _get$3(e.prototype.__proto__ || Object.getPrototypeOf(e.prototype), "addDataPoint", this).call(this, t7, n, i), this.data.labels.splice(i, 0, t7), this.data.datasets.map(function(t8, e2) {
          t8.values.splice(i, 0, n[e2]);
        }), this.update(this.data);
      } }, { key: "removeDataPoint", value: function() {
        var t7 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.state.datasetLength - 1;
        this.data.labels.length <= 1 || (_get$3(e.prototype.__proto__ || Object.getPrototypeOf(e.prototype), "removeDataPoint", this).call(this, t7), this.data.labels.splice(t7, 1), this.data.datasets.map(function(e2) {
          e2.values.splice(t7, 1);
        }), this.update(this.data));
      } }, { key: "updateDataset", value: function(t7) {
        var e2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
        this.data.datasets[e2].values = t7, this.update(this.data);
      } }, { key: "updateDatasets", value: function(t7) {
        this.data.datasets.map(function(e2, n) {
          t7[n] && (e2.values = t7[n]);
        }), this.update(this.data);
      } }]), e;
    })(BaseChart);
    _createClass$8 = function() {
      function t6(t7, e) {
        for (var n = 0; n < e.length; n++) {
          var i = e[n];
          i.enumerable = i.enumerable || false, i.configurable = true, "value" in i && (i.writable = true), Object.defineProperty(t7, i.key, i);
        }
      }
      return function(e, n, i) {
        return n && t6(e.prototype, n), i && t6(e, i), e;
      };
    }();
    _get$4 = function t5(e, n, i) {
      e === null && (e = Function.prototype);
      var a = Object.getOwnPropertyDescriptor(e, n);
      if (a === void 0) {
        var r = Object.getPrototypeOf(e);
        return r === null ? void 0 : t5(r, n, i);
      }
      if ("value" in a)
        return a.value;
      var o = a.get;
      if (o !== void 0)
        return o.call(i);
    };
    (function(t6) {
      function e(t7, n) {
        _classCallCheck$9(this, e);
        var i = _possibleConstructorReturn$5(this, (e.__proto__ || Object.getPrototypeOf(e)).call(this, t7, n));
        return i.type = "donut", i.initTimeout = 0, i.init = 1, i.setup(), i;
      }
      return _inherits$5(e, t6), _createClass$8(e, [{ key: "configure", value: function(t7) {
        _get$4(e.prototype.__proto__ || Object.getPrototypeOf(e.prototype), "configure", this).call(this, t7), this.mouseMove = this.mouseMove.bind(this), this.mouseLeave = this.mouseLeave.bind(this), this.hoverRadio = t7.hoverRadio || 0.1, this.config.startAngle = t7.startAngle || 0, this.clockWise = t7.clockWise || false, this.strokeWidth = t7.strokeWidth || 30;
      } }, { key: "calc", value: function() {
        var t7 = this;
        _get$4(e.prototype.__proto__ || Object.getPrototypeOf(e.prototype), "calc", this).call(this);
        var n = this.state;
        this.radius = this.height > this.width ? this.center.x - this.strokeWidth / 2 : this.center.y - this.strokeWidth / 2;
        var i = this.radius, a = this.clockWise, r = n.slicesProperties || [];
        n.sliceStrings = [], n.slicesProperties = [];
        var o = 180 - this.config.startAngle;
        n.sliceTotals.map(function(e2, s2) {
          var l = o, u = e2 / n.grandTotal * FULL_ANGLE, c = u > 180 ? 1 : 0, h = a ? -u : u, d2 = o += h, f = getPositionByAngle(l, i), p = getPositionByAngle(d2, i), v = t7.init && r[s2], g = void 0, y = void 0;
          t7.init ? (g = v ? v.startPosition : f, y = v ? v.endPosition : f) : (g = f, y = p);
          var m = u === 360 ? makeStrokeCircleStr(g, y, t7.center, t7.radius, t7.clockWise, c) : makeArcStrokePathStr(g, y, t7.center, t7.radius, t7.clockWise, c);
          n.sliceStrings.push(m), n.slicesProperties.push({ startPosition: f, endPosition: p, value: e2, total: n.grandTotal, startAngle: l, endAngle: d2, angle: h });
        }), this.init = 0;
      } }, { key: "setupComponents", value: function() {
        var t7 = this.state, e2 = [["donutSlices", {}, function() {
          return { sliceStrings: t7.sliceStrings, colors: this.colors, strokeWidth: this.strokeWidth };
        }.bind(this)]];
        this.components = new Map(e2.map(function(t8) {
          var e3 = getComponent.apply(void 0, _toConsumableArray$7(t8));
          return [t8[0], e3];
        }));
      } }, { key: "calTranslateByAngle", value: function(t7) {
        var e2 = this.radius, n = this.hoverRadio, i = getPositionByAngle(t7.startAngle + t7.angle / 2, e2);
        return "translate3d(" + i.x * n + "px," + i.y * n + "px,0)";
      } }, { key: "hoverSlice", value: function(t7, e2, n, i) {
        if (t7) {
          var a = this.colors[e2];
          if (n) {
            transform(t7, this.calTranslateByAngle(this.state.slicesProperties[e2])), t7.style.stroke = lightenDarkenColor(a, 50);
            var r = getOffset(this.svg), o = i.pageX - r.left + 10, s2 = i.pageY - r.top - 10, l = (this.formatted_labels && this.formatted_labels.length > 0 ? this.formatted_labels[e2] : this.state.labels[e2]) + ": ", u = (100 * this.state.sliceTotals[e2] / this.state.grandTotal).toFixed(1);
            this.tip.setValues(o, s2, { name: l, value: u + "%" }), this.tip.showTip();
          } else
            transform(t7, "translate3d(0,0,0)"), this.tip.hideTip(), t7.style.stroke = a;
        }
      } }, { key: "bindTooltip", value: function() {
        this.container.addEventListener("mousemove", this.mouseMove), this.container.addEventListener("mouseleave", this.mouseLeave);
      } }, { key: "mouseMove", value: function(t7) {
        var e2 = t7.target, n = this.components.get("donutSlices").store, i = this.curActiveSliceIndex, a = this.curActiveSlice;
        if (n.includes(e2)) {
          var r = n.indexOf(e2);
          this.hoverSlice(a, i, false), this.curActiveSlice = e2, this.curActiveSliceIndex = r, this.hoverSlice(e2, r, true, t7);
        } else
          this.mouseLeave();
      } }, { key: "mouseLeave", value: function() {
        this.hoverSlice(this.curActiveSlice, this.curActiveSliceIndex, false);
      } }]), e;
    })(AggregationChart);
    Base = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { data = {
        labels: [],
        datasets: [{ values: [] }],
        yMarkers: {},
        yRegions: []
      } } = $$props;
      let { title: title2 = "" } = $$props;
      let { type = "line" } = $$props;
      let { height: height2 = 300 } = $$props;
      let { animate = true } = $$props;
      let { axisOptions = {} } = $$props;
      let { barOptions = {} } = $$props;
      let { lineOptions = {} } = $$props;
      let { tooltipOptions = {} } = $$props;
      let { colors = [] } = $$props;
      let { valuesOverPoints: valuesOverPoints2 = 0 } = $$props;
      let { isNavigable = false } = $$props;
      let { maxSlices = 3 } = $$props;
      let chart = null;
      let chartRef;
      function ifChartThen(fn) {
        return function ifChart(...args) {
          if (chart) {
            return fn(...args);
          }
        };
      }
      const addDataPoint = ifChartThen((label, valueFromEachDataset, index) => chart.addDataPoint(label, valueFromEachDataset, index));
      const removeDataPoint = ifChartThen((index) => chart.removeDataPoint(index));
      const exportChart = ifChartThen(() => chart.export());
      const updateChart = ifChartThen((newData) => chart.update(newData));
      onDestroy(() => {
        chart = null;
      });
      if ($$props.data === void 0 && $$bindings.data && data !== void 0)
        $$bindings.data(data);
      if ($$props.title === void 0 && $$bindings.title && title2 !== void 0)
        $$bindings.title(title2);
      if ($$props.type === void 0 && $$bindings.type && type !== void 0)
        $$bindings.type(type);
      if ($$props.height === void 0 && $$bindings.height && height2 !== void 0)
        $$bindings.height(height2);
      if ($$props.animate === void 0 && $$bindings.animate && animate !== void 0)
        $$bindings.animate(animate);
      if ($$props.axisOptions === void 0 && $$bindings.axisOptions && axisOptions !== void 0)
        $$bindings.axisOptions(axisOptions);
      if ($$props.barOptions === void 0 && $$bindings.barOptions && barOptions !== void 0)
        $$bindings.barOptions(barOptions);
      if ($$props.lineOptions === void 0 && $$bindings.lineOptions && lineOptions !== void 0)
        $$bindings.lineOptions(lineOptions);
      if ($$props.tooltipOptions === void 0 && $$bindings.tooltipOptions && tooltipOptions !== void 0)
        $$bindings.tooltipOptions(tooltipOptions);
      if ($$props.colors === void 0 && $$bindings.colors && colors !== void 0)
        $$bindings.colors(colors);
      if ($$props.valuesOverPoints === void 0 && $$bindings.valuesOverPoints && valuesOverPoints2 !== void 0)
        $$bindings.valuesOverPoints(valuesOverPoints2);
      if ($$props.isNavigable === void 0 && $$bindings.isNavigable && isNavigable !== void 0)
        $$bindings.isNavigable(isNavigable);
      if ($$props.maxSlices === void 0 && $$bindings.maxSlices && maxSlices !== void 0)
        $$bindings.maxSlices(maxSlices);
      if ($$props.addDataPoint === void 0 && $$bindings.addDataPoint && addDataPoint !== void 0)
        $$bindings.addDataPoint(addDataPoint);
      if ($$props.removeDataPoint === void 0 && $$bindings.removeDataPoint && removeDataPoint !== void 0)
        $$bindings.removeDataPoint(removeDataPoint);
      if ($$props.exportChart === void 0 && $$bindings.exportChart && exportChart !== void 0)
        $$bindings.exportChart(exportChart);
      {
        updateChart(data);
      }
      return `<div${add_attribute("this", chartRef, 0)}></div>`;
    });
    load3 = async ({ page: { params }, fetch: fetch2 }) => {
      const { slug } = params;
      const res = await fetch2("https://api.merrybrew.app/posts/" + slug);
      if (res.status === 404) {
        const error2 = new Error(`The post with ID ${slug} was not found`);
        return { status: 404, error: error2 };
      } else {
        const data = await res.json();
        return { props: { post: data } };
      }
    };
    valuesOverPoints = true;
    title = "Gravity measurements in excess of 1000";
    height = 350;
    U5Bslugu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $user, $$unsubscribe_user;
      $$unsubscribe_user = subscribe(user, (value) => $user = value);
      let { post } = $$props;
      var datay = post.values["process"]["measures"].map(function(x) {
        return x["date"];
      });
      var datax = post.values["process"]["measures"].map(function(x) {
        return x["data"] - 1e3;
      });
      let data = {
        labels: datay,
        yMarkers: [
          {
            label: "Target Gravity",
            value: post.values["recipe"]["targetgravity"] - 1e3,
            options: { labelPos: "right" }
          },
          { label: "", value: 0 }
        ],
        datasets: [{ values: datax }]
      };
      let lineOptions = { dotSize: 8 };
      let colors = ["#000000"];
      let { basicVisible = true } = $$props;
      let { stepsVisible = false } = $$props;
      let { measuresVisible = false } = $$props;
      let { notesVisible = false } = $$props;
      let { section: section2 = "" } = $$props;
      if ($$props.post === void 0 && $$bindings.post && post !== void 0)
        $$bindings.post(post);
      if ($$props.basicVisible === void 0 && $$bindings.basicVisible && basicVisible !== void 0)
        $$bindings.basicVisible(basicVisible);
      if ($$props.stepsVisible === void 0 && $$bindings.stepsVisible && stepsVisible !== void 0)
        $$bindings.stepsVisible(stepsVisible);
      if ($$props.measuresVisible === void 0 && $$bindings.measuresVisible && measuresVisible !== void 0)
        $$bindings.measuresVisible(measuresVisible);
      if ($$props.notesVisible === void 0 && $$bindings.notesVisible && notesVisible !== void 0)
        $$bindings.notesVisible(notesVisible);
      if ($$props.section === void 0 && $$bindings.section && section2 !== void 0)
        $$bindings.section(section2);
      $$unsubscribe_user();
      return `${post.values["public"] || post.author.id === $user.id ? `<div id="${"sections"}" class="${"my-2 flex justify-center pb-2 px-0 items-center gap-2 max-w-4xl border-gray-500 border-b"}"><button class="${"bg-gray-" + escape2(basicVisible ? "700" : "500") + " text-white font-semibold py-1 px-2 rounded border-transparent"}" id="${"basic"}">RECIPE</button>
	<button class="${"bg-gray-" + escape2(stepsVisible ? "700" : "500") + " text-white font-semibold py-1 px-2 rounded border-transparent"}" id="${"steps"}">PROCESS</button>
	<button class="${"bg-gray-" + escape2(measuresVisible ? "700" : "500") + " text-white font-semibold py-1 px-2 rounded border-transparent"}" id="${"measures"}">MEASURES</button>
	<button class="${"bg-gray-" + escape2(notesVisible ? "700" : "500") + " text-white font-semibold py-1 px-2 rounded border-transparent"}" id="${"notes"}">NOTES</button></div>

<div class="${"flex"}"><h1 class="${"flex font-serif text-left py-0 px-4 text-3xl mt-4 max-w-4xl"}">${escape2(post.title)}</h1>
<p class="${"justify-end text-right py-2 px-1 mt-4"}">${post.values["finished"] ? `${validate_component(Fa, "Fa").$$render($$result, { icon: faWineBottle2, size: "lg" }, {}, {})}` : `${validate_component(Fa, "Fa").$$render($$result, {
        icon: faHourglassHalf2,
        size: "lg",
        spin: true
      }, {}, {})}`}</p>
<p class="${"justify-end text-right py-2 px-1 pr-4 mt-4"}">${post.values["public"] ? `${validate_component(Fa, "Fa").$$render($$result, { icon: faEye2, size: "lg" }, {}, {})}` : `${validate_component(Fa, "Fa").$$render($$result, { icon: faEyeSlash2, size: "lg" }, {}, {})}`}</p></div>
${post.values["description"] ? `<p class="${"pl-6 pr-4 italic font-serif max-w-4xl"}">${escape2(post.values["description"])}</p>` : ``}
${post.values["when"] ? `<p class="${"w-fill flex border-double border-4 text-sm p-3 pl-3 text-gray-100 bg-gray-500 text-left gap-2 py-2 px-4 mt-2 rounded-sm max-w-4xl"}">${validate_component(Fa, "Fa").$$render($$result, {
        icon: faCalendarAlt,
        translateY: "0.2",
        size: "sm"
      }, {}, {})} ${escape2(post.values["when"])}</p>` : ``}


<div id="${"basic"}"${add_attribute("class", basicVisible ? "" : "hidden", 0)}><div class="${"shadow-xl rounded-lg max-w-4xl"}"><p class="${"text-left py-2 pl-4 text-2xl mt-2 font-serif"}">Main ingredients</p>
  ${post.values["recipe"]["main"].length > 0 ? `<ul class="${"text-left pb-6 pl-12 pr-4 mt-2 list-disc "}">${each(post.values["recipe"]["main"], (main, idx) => `<li><p>${escape2(main.type)}. ${escape2(main.quantity)} ${escape2(main.units)}</p>
	</li>`)}</ul>` : `<p class="${"italic text-left pb-6 pl-8 mt-2"}">No data</p>`}
	<p class="${"text-left pb-2 pl-4 text-2xl mt-2 font-serif"}">Secondary ingredients</p>
	${post.values["recipe"]["secondary"].length > 0 ? `<ul class="${"text-left pb-6 pl-12 mt-2 list-disc "}">${each(post.values["recipe"]["secondary"], (secondary, idx) => `<li><p>${escape2(secondary)}</p>
	  </li>`)}</ul>` : `<p class="${"italic text-left pb-6 pl-8 mt-2"}">No data</p>`}</div>
	<div class="${"shadow-xl rounded-lg max-w-4xl"}"><p class="${"w-fill font-semibold flex p-3 pl-3 text-gray-100 bg-gray-700 text-left py-2 px-4 mt-2 rounded-sm"}">Conditions</p>
	${post.values["recipe"]["conditions"] ? `<p class="${"text-left py-2 px-4 mt-2"}">${escape2(post.values["recipe"]["conditions"])}</p>` : `<p class="${"italic text-left py-2 px-4 mt-2"}">No data</p>`}
	
	<p class="${"w-fill font-semibold flex p-3 pl-3 text-gray-100 bg-gray-700 text-left py-2 px-4 mt-2 rounded-sm"}">Expected result</p>
	${post.values["recipe"]["result"] ? `<p class="${"text-left py-2 px-4 mt-2"}">${escape2(post.values["recipe"]["result"])}</p>` : `<p class="${"italic text-left py-2 px-4 mt-2"}">No data</p>`}
	<div class="${"pb-3"}"></div></div></div>

<div id="${"steps"}"${add_attribute("class", stepsVisible ? "" : "hidden", 0)}><div class="${"shadow-xl rounded-lg max-w-4xl"}"><p class="${"w-fill font-semibold flex p-3 pl-3 text-gray-100 bg-gray-700 text-left py-2 px-4 mt-2 rounded-sm"}">Preparation</p>

  ${post.values["process"]["preparation"] ? `<p class="${"text-left py-2 px-4 mt-2"}">${escape2(post.values["process"]["preparation"])}</p>` : `<p class="${"italic text-left py-2 px-4 mt-2"}">No data</p>`}

  <p class="${"w-fill font-semibold flex p-3 pl-3 text-gray-100 bg-gray-700 text-left py-2 px-4 mt-2 rounded-sm"}">Materials</p>
  ${post.values["process"]["materials"] ? `<p class="${"text-left py-2 px-4 mt-2"}">${escape2(post.values["process"]["materials"])}</p>` : `<p class="${"italic text-left py-2 px-4 mt-2"}">No data</p>`}

  <p class="${"w-fill font-semibold flex p-3 pl-3 text-gray-100 bg-gray-700 text-left py-2 px-4 mt-2 rounded-sm"}">Steps</p>

  ${post.values["process"]["steps"].length > 0 ? `<ul class="${"text-left py-2 px-4 mt-2"}">${each(post.values["process"]["steps"], (step, idx) => `<li>${step.date ? `<p class="${"bg-gray-300 p-1"}">${escape2(step.date)}</p>` : `<p class="${"bg-gray-300 p-1"}">Next step</p>`}
		
		<p class="${"p-1 pl-2"}">${escape2(step.type)}</p>
	</li>`)}</ul>` : `<p class="${"italic text-left py-2 px-4 mt-2"}">No data</p>`}

  
  
  <div class="${"pb-3"}"></div></div></div>

<div id="${"measures"}"${add_attribute("class", measuresVisible ? "" : "hidden", 0)}>${post.values["process"]["measures"].length > 0 ? `<div class="${"shadow-xl rounded-lg max-w-4xl"}">${validate_component(Base, "Chart").$$render($$result, {
        data,
        lineOptions,
        valuesOverPoints,
        title,
        height,
        colors,
        type: "line"
      }, {}, {})}
	<div class="${"pb-8"}"></div></div>` : ``}
  
	<div class="${"shadow-xl rounded-lg max-w-4xl"}"><div class="${"flex border-b pt-1 pb-3"}"><div class="${"text-left font-bold py-2 px-4 mt-2"}">Target Gravity</div><div class="${"text-left font-bold py-2 px-4 mt-2 text-white font-bold bg-gray-700"}">${escape2(post.values["recipe"]["targetgravity"])}</div></div>
  <div class="${"px-8 pt-5"}"><table class="${"table-auto border-collapse border-gray-400"}"><thead class="${""}"><tr class="${"bg-gray-600 text-white"}"><th class="${"p-3"}">Date</th>
		  <th class="${"p-3"}">Gravity</th></tr></thead>
	  <tbody class="${"text-right py-2 px-4 mt-2 border-dotted border-2"}">${each(post.values["process"]["measures"], (measure, idx) => `<tr class="${"odd:bg-red even:bg-gray-100"}"><td class="${"p-2"}">${measure.date ? `${escape2(measure.date)}` : `No date given`}</td>
		  <td class="${"p-2"}">${escape2(measure.data)}</td>
		</tr>`)}</tbody></table>
  <div class="${"pb-8"}"></div></div></div></div>


<div id="${"notes"}"${add_attribute("class", notesVisible ? "" : "hidden", 0)}><div class="${"shadow-xl py-2 rounded-lg border-2 max-w-4xl"}"><p class="${"flex gap-2 text-left py-0 px-4 mt-2"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faUser, size: "lg" }, {}, {})}${escape2(post.author.username)}</p>
		<p class="${"flex gap-2 text-left py-0 px-4 mt-2 italic"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faCalendar, size: "lg" }, {}, {})}Project created on ${escape2(post.created_at.substring(0, 10))}</p>
		<p class="${"flex gap-2 text-left py-0 px-4 mt-2 italic"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faClock, size: "lg" }, {}, {})}Project last updated on ${escape2(post.updated_at.substring(0, 10))}</p>
		<div class="${"pb-3"}"></div></div>
		
	<div class="${"shadow-xl rounded-lg max-w-4xl"}">${post.values["notes"] ? `<p class="${"text-left py-2 px-4 mt-2"}">${escape2(post.values["notes"])}</p>` : `<p class="${"italic text-left py-2 px-4 mt-2"}">No data</p>`}
  
  <div class="${"pb-3"}"></div></div></div>


<div class="${"my-2 flex justify-between py-2 px-4 max-w-4xl items-center gap-2"}">${$user && post.author.id === $user.id ? `<button class="${"bg-red-100 text-white font-bold py-1 px-2 rounded border-transparent"}">${validate_component(Fa, "Fa").$$render($$result, {
        icon: faTrash,
        color: "#c08080",
        size: "lg"
      }, {}, {})}</button>

			<button class="${"bg-gray-100 text-white text-right font-bold py-3 px-2 rounded border-transparent"}">${validate_component(Fa, "Fa").$$render($$result, {
        icon: faEdit,
        color: "#333333",
        size: "3x"
      }, {}, {})}</button>` : ``}
	
	${$user && (post.values["public"] || post.author.id === $user.id) ? `<button class="${"bg-blue-100 text-white font-bold py-1 px-2 rounded border-transparent"}">${validate_component(Fa, "Fa").$$render($$result, {
        icon: faClone,
        color: "#6C9BD2",
        size: "lg"
      }, {}, {})}</button>` : ``}</div>` : ``}`;
    });
  }
});

// .svelte-kit/output/server/chunks/login-29038ea0.js
var login_29038ea0_exports = {};
__export(login_29038ea0_exports, {
  default: () => Login
});
import "cookie";
import "@lukeed/uuid";
var css2, Login;
var init_login_29038ea0 = __esm({
  ".svelte-kit/output/server/chunks/login-29038ea0.js"() {
    init_shims();
    init_app_d23b9461();
    init_user_b0829f99();
    init_ssr();
    css2 = {
      code: "label.svelte-1i0164s{margin-bottom:0.25rem;display:block;font-weight:700}input.svelte-1i0164s{width:100%;border-radius:0.25rem;border-width:1px;--tw-border-opacity:1;border-color:rgba(156, 163, 175, var(--tw-border-opacity));--tw-bg-opacity:1;background-color:rgba(255, 255, 255, var(--tw-bg-opacity));padding-left:1rem;padding-right:1rem;padding-top:0.5rem;padding-bottom:0.5rem;outline:2px solid transparent;outline-offset:2px}.submit.svelte-1i0164s{border-radius:0.25rem;border-color:transparent;--tw-bg-opacity:1;background-color:rgba(55, 65, 81, var(--tw-bg-opacity));padding-left:1rem;padding-right:1rem;padding-top:0.5rem;padding-bottom:0.5rem;--tw-text-opacity:1;color:rgba(255, 255, 255, var(--tw-text-opacity))}",
      map: null
    };
    Login = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $$unsubscribe_user;
      $$unsubscribe_user = subscribe(user, (value) => value);
      let email = "";
      let password = "";
      $$result.css.add(css2);
      $$unsubscribe_user();
      return `<div class="${"p-10 max-w-3xl"}"><form class="${"container mx-auto"}"><h1 class="${"text-center text-2xl pb-2 font-bold"}">Welcome to Merrybrew!</h1>
	<h2 class="${"text-center text-lg pb-2 font-bold"}">During early access please request a user via invite@merrybrew.app</h2>

	<div class="${"my-1"}"><label for="${"email"}" class="${"svelte-1i0164s"}">Email</label>
		<input type="${"email"}" placeholder="${"Enter your email"}" class="${"svelte-1i0164s"}"${add_attribute("value", email, 0)}></div>
	<div class="${"my-1"}"><label for="${"password"}" class="${"svelte-1i0164s"}">Password</label>
		<input type="${"password"}" placeholder="${"Enter your password"}" class="${"svelte-1i0164s"}"${add_attribute("value", password, 0)}></div>
	<div class="${"my-3"}"><button class="${"submit svelte-1i0164s"}" type="${"submit"}">Login</button></div></form>
</div>`;
    });
  }
});

// .svelte-kit/output/server/chunks/new-cb2804ab.js
var new_cb2804ab_exports = {};
__export(new_cb2804ab_exports, {
  default: () => New,
  load: () => load4
});
import { faPlusSquare, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import "cookie";
import "@lukeed/uuid";
var css3, section, load4, mt, New;
var init_new_cb2804ab = __esm({
  ".svelte-kit/output/server/chunks/new-cb2804ab.js"() {
    init_shims();
    init_app_d23b9461();
    init_user_b0829f99();
    init_fa_6986f2e9();
    init_ssr();
    css3 = {
      code: "label.svelte-1cxo22x{margin-top:0.75rem;margin-bottom:0.25rem;display:block;font-weight:700}input.svelte-1cxo22x{width:100%;border-radius:0.25rem;border-width:1px;--tw-border-opacity:1;border-color:rgba(209, 213, 219, var(--tw-border-opacity));--tw-bg-opacity:1;background-color:rgba(255, 255, 255, var(--tw-bg-opacity));padding-left:1rem;padding-right:1rem;padding-top:0.5rem;padding-bottom:0.5rem;outline:2px solid transparent;outline-offset:2px}textarea.svelte-1cxo22x{width:100%;resize:vertical;border-radius:0.25rem;border-width:1px;--tw-border-opacity:1;border-color:rgba(209, 213, 219, var(--tw-border-opacity));--tw-bg-opacity:1;background-color:rgba(255, 255, 255, var(--tw-bg-opacity));padding-left:1rem;padding-right:1rem;padding-top:0.5rem;padding-bottom:0.5rem;outline:2px solid transparent;outline-offset:2px}.submit.svelte-1cxo22x{border-radius:0.25rem;border-color:transparent;--tw-bg-opacity:1;background-color:rgba(5, 150, 105, var(--tw-bg-opacity));padding-left:1rem;padding-right:1rem;padding-top:0.5rem;padding-bottom:0.5rem;--tw-text-opacity:1;color:rgba(255, 255, 255, var(--tw-text-opacity))}",
      map: null
    };
    section = "";
    load4 = async ({ fetch: fetch2, page: { query } }) => {
      const edit = query.get("edit");
      section = query.get("section");
      if (edit) {
        const res = await fetch2("https://api.merrybrew.app/posts/" + edit);
        if (res.status === 404) {
          const error2 = new Error(`The post with ID ${edit} was not found`);
          return { status: 404, error: error2 };
        } else {
          const data = await res.json();
          return {
            props: {
              editId: edit,
              section,
              title: data.title,
              values: data.values
            }
          };
        }
      }
      return { props: {} };
    };
    mt = {
      title: "title is not handled here",
      description: "",
      when: "",
      finished: false,
      public: false,
      notes: "",
      recipe: {
        main: [
          { type: "water", quantity: 5, units: "l" },
          { type: "honey", quantity: 3, units: "kg" },
          { type: "yeast", quantity: 4, units: "gr" }
        ],
        secondary: ["raisins", "lavender", "tea"],
        targetgravity: 0,
        conditions: "",
        result: ""
      },
      process: {
        preparation: "",
        materials: "",
        steps: [
          {
            type: "Sanitize material",
            date: "2021-10-12"
          }
        ],
        measures: [{ data: 1090, date: "2021-10-12" }]
      }
    };
    New = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $$unsubscribe_user;
      $$unsubscribe_user = subscribe(user, (value) => value);
      let { editId } = $$props;
      let { section: section2 } = $$props;
      let { title: title2 = "" } = $$props;
      let { values = JSON.parse(JSON.stringify(mt)) } = $$props;
      let { basicVisible = true } = $$props;
      let { stepsVisible = false } = $$props;
      let { measuresVisible = false } = $$props;
      let { notesVisible = false } = $$props;
      if ($$props.editId === void 0 && $$bindings.editId && editId !== void 0)
        $$bindings.editId(editId);
      if ($$props.section === void 0 && $$bindings.section && section2 !== void 0)
        $$bindings.section(section2);
      if ($$props.title === void 0 && $$bindings.title && title2 !== void 0)
        $$bindings.title(title2);
      if ($$props.values === void 0 && $$bindings.values && values !== void 0)
        $$bindings.values(values);
      if ($$props.basicVisible === void 0 && $$bindings.basicVisible && basicVisible !== void 0)
        $$bindings.basicVisible(basicVisible);
      if ($$props.stepsVisible === void 0 && $$bindings.stepsVisible && stepsVisible !== void 0)
        $$bindings.stepsVisible(stepsVisible);
      if ($$props.measuresVisible === void 0 && $$bindings.measuresVisible && measuresVisible !== void 0)
        $$bindings.measuresVisible(measuresVisible);
      if ($$props.notesVisible === void 0 && $$bindings.notesVisible && notesVisible !== void 0)
        $$bindings.notesVisible(notesVisible);
      $$result.css.add(css3);
      $$unsubscribe_user();
      return `<div id="${"sections"}" class="${"my-2 flex justify-center pb-2 px-0 items-center gap-2 max-w-4xl border-gray-500 border-b"}"><button class="${"bg-gray-" + escape2(basicVisible ? "700" : "500") + " text-white font-semibold py-1 px-2 rounded border-transparent"}" id="${"basic"}">RECIPE</button>
	<button class="${"bg-gray-" + escape2(stepsVisible ? "700" : "500") + " text-white font-semibold py-1 px-2 rounded border-transparent"}" id="${"steps"}">PROCESS</button>
	<button class="${"bg-gray-" + escape2(measuresVisible ? "700" : "500") + " text-white font-semibold py-1 px-2 rounded border-transparent"}" id="${"measures"}">MEASURES</button>
	<button class="${"bg-gray-" + escape2(notesVisible ? "700" : "500") + " text-white font-semibold py-1 px-2 rounded border-transparent"}" id="${"notes"}">NOTES</button></div>


<form class="${"max-w-4xl container pl-4 pr-4 pb-4"}"><div id="${"basic"}"${add_attribute("class", basicVisible ? "" : "hidden", 0)}><div class="${"my-1"}"><label for="${"title"}" class="${"svelte-1cxo22x"}">Title</label>
		<input type="${"text"}" placeholder="${"Enter title"}" id="${"title"}" class="${"svelte-1cxo22x"}"${add_attribute("value", title2, 0)}></div>
	<div class="${"my-1"}"><label for="${"when"}" class="${"svelte-1cxo22x"}">When</label>
		<input type="${"text"}" placeholder="${"Freeform relevant project time info"}" id="${"when"}" class="${"svelte-1cxo22x"}"${add_attribute("value", values.when, 0)}></div>
	<div class="${"my-1"}"><label for="${"description"}" class="${"svelte-1cxo22x"}">Description</label>
		<input type="${"text"}" placeholder="${"A short description of the project"}" id="${"when"}" class="${"svelte-1cxo22x"}"${add_attribute("value", values.description, 0)}></div>

	<div><label for="${"title"}" class="${"svelte-1cxo22x"}">Main Ingredients</label>
			<ul>${each(values.recipe.main, (main, idx) => `<li class="${"flex mb-1"}"><button class="${"px-2"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faTrashAlt, size: "sm" }, {}, {})}</button>

				<input class="${"mr-1 svelte-1cxo22x"}" type="${"text"}"${add_attribute("name", `main[${idx}]`, 0)} placeholder="${"water"}"${add_attribute("value", main.type, 0)}>
				<input type="${"text"}"${add_attribute("name", `main[${idx}]`, 0)} placeholder="${"0"}" class="${"svelte-1cxo22x"}"${add_attribute("value", main.quantity, 0)}>
				<input type="${"text"}"${add_attribute("name", `main[${idx}]`, 0)} placeholder="${"kg"}" class="${"svelte-1cxo22x"}"${add_attribute("value", main.units, 0)}>
	
			  </li>`)}</ul></div>
	<div class="${"flex justify-end"}"><button class="${"p-1"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faPlusSquare, size: "2x" }, {}, {})}</button></div>

	<div><label for="${"title"}" class="${"svelte-1cxo22x"}">Secondary Ingredients</label>
			<ul>${each(values.recipe.secondary, (secondary, idx) => `<li class="${"flex mb-1"}"><button class="${"px-2"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faTrashAlt, size: "sm" }, {}, {})}</button>

				<input type="${"text"}"${add_attribute("name", `secondary[${idx}]`, 0)} placeholder="${"New Secondary Ingredient"}" class="${"svelte-1cxo22x"}"${add_attribute("value", secondary, 0)}>
	
		  	</li>`)}</ul></div>
	<div class="${"flex justify-end"}"><button class="${"p-1"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faPlusSquare, size: "2x" }, {}, {})}</button></div>

	<div class="${"my-1"}"><label for="${"title"}" class="${"svelte-1cxo22x"}">Conditions</label>
		<textarea rows="${"3"}" type="${"text"}" placeholder="${"Enter notes on conditions"}" id="${"conditions"}" class="${"svelte-1cxo22x"}">${values.recipe.conditions || ""}</textarea></div>
	<div class="${"my-1"}"><label for="${"title"}" class="${"svelte-1cxo22x"}">Expected result</label>
		<textarea rows="${"3"}" type="${"text"}" placeholder="${"Enter notes on expected result"}" id="${"result"}" class="${"svelte-1cxo22x"}">${values.recipe.result || ""}</textarea></div>


	<div class="${"flex"}"><button class="${"bg-gray-" + escape2(values.finished ? "700" : "300") + " text-white font-semibold py-1 px-2 mr-2 rounded border-transparent"}" id="${"finished"}">Finished</button>
		<button class="${"bg-gray-" + escape2(values.public ? "700" : "300") + " text-white font-semibold py-1 px-2 rounded border-transparent"}" id="${"public"}">Public</button></div></div>

<div id="${"steps"}"${add_attribute("class", stepsVisible ? "" : "hidden", 0)}><div class="${"my-1"}"><label for="${"title"}" class="${"svelte-1cxo22x"}">Preparation</label>
		<textarea rows="${"3"}" type="${"text"}" placeholder="${"Enter notes on preparation"}" id="${"preparation"}" class="${"svelte-1cxo22x"}">${values.process.preparation || ""}</textarea></div>
	<div class="${"my-1"}"><label for="${"title"}" class="${"svelte-1cxo22x"}">Materials</label>
		<textarea rows="${"3"}" type="${"text"}" placeholder="${"Enter notes on materials"}" id="${"materials"}" class="${"svelte-1cxo22x"}">${values.process.materials || ""}</textarea></div>

    <div><label for="${"title"}" class="${"svelte-1cxo22x"}">Steps</label>
		<ul>${each(values.process.steps, (step, idx) => `<li class="${"flex mb-1"}"><button class="${"px-2"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faTrashAlt, size: "sm" }, {}, {})}</button>

			<textarea class="${"mr-1 svelte-1cxo22x"}" cols="${"3"}" type="${"text"}"${add_attribute("name", `step[${idx}]`, 0)} placeholder="${"a step"}">${step.type || ""}</textarea>
			<input class="${" svelte-1cxo22x"}" type="${"date"}"${add_attribute("name", `step[${idx}]`, 0)} placeholder="${""}"${add_attribute("value", step.date, 0)}>
	
		  </li>`)}</ul></div>
	  <div class="${"flex justify-end"}"><button class="${"p-1"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faPlusSquare, size: "2x" }, {}, {})}</button></div></div>
<div id="${"steps"}"${add_attribute("class", measuresVisible ? "" : "hidden", 0)}><div class="${"flex my-1"}"><label for="${"title"}" class="${"svelte-1cxo22x"}">Target Gravity</label>
			<input class="${"mt-5 mb-2 svelte-1cxo22x"}" type="${"number"}" placeholder="${"1010"}" id="${"targetgravity"}"${add_attribute("value", values.recipe.targetgravity, 0)}></div>
				
		<ul>${each(values.process.measures, (measure, idx) => `<li class="${"flex mb-1"}"><button class="${"px-2"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faTrashAlt, size: "sm" }, {}, {})}</button>
	  
			  <input class="${"mr-1 svelte-1cxo22x"}" type="${"number"}"${add_attribute("name", `measure[${idx}]`, 0)} placeholder="${"1000"}"${add_attribute("value", measure.data, 0)}>
			  <input type="${"date"}"${add_attribute("name", `measure[${idx}]`, 0)} placeholder="${""}" class="${"svelte-1cxo22x"}"${add_attribute("value", measure.date, 0)}>
			  
	  
			</li>`)}</ul>
		  <div class="${"flex justify-end"}"><button class="${"p-1"}">${validate_component(Fa, "Fa").$$render($$result, { icon: faPlusSquare, size: "2x" }, {}, {})}</button></div></div>

			<div id="${"notes"}"${add_attribute("class", notesVisible ? "" : "hidden", 0)}><div class="${"my-1"}"><label for="${"title"}" class="${"svelte-1cxo22x"}">Notes</label>
			<textarea rows="${"10"}" type="${"text"}" placeholder="${"Enter notes on notes"}" id="${"preparation"}" class="${"svelte-1cxo22x"}">${values.notes || ""}</textarea></div></div>
<div class="${"relative grid justify-items-end absolute bottom-0 "}"><div class="${""}"><button class="${"submit bg-black-700 svelte-1cxo22x"}" type="${"submit"}">Submit</button>
		<a href="${"/projects/" + escape2(editId)}" class="${"p-2 underline"}" type="${"cancel"}">Cancel</a></div></div>

</form>`;
    });
  }
});

// .svelte-kit/output/server/chunks/app-d23b9461.js
import cookie from "cookie";
import { v4 } from "@lukeed/uuid";
function noop2() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function safe_not_equal2(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    return noop2;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function null_to_empty(value) {
  return value == null ? "" : value;
}
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function onDestroy(fn) {
  get_current_component().$$.on_destroy.push(fn);
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
function escape2(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped2[match]);
}
function each(items, fn) {
  let str = "";
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }
  return str;
}
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(context || (parent_component ? parent_component.$$.context : [])),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css22) => css22.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape2(value)) : `"${value}"`}`}`;
}
function afterUpdate() {
}
function set_paths(paths2) {
  base = paths2.base;
  assets = paths2.assets || base;
}
function set_prerendering(value) {
}
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  const hooks = get_hooks(user_hooks);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: assets + "/_app/start-366fd3af.js",
      css: [assets + "/_app/assets/start-c1dab058.css", assets + "/_app/assets/vendor-44e2f755.css"],
      js: [assets + "/_app/start-366fd3af.js", assets + "/_app/chunks/vendor-7b1553fa.js", assets + "/_app/chunks/preload-helper-ec9aa979.js", assets + "/_app/chunks/singletons-12a22614.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => assets + "/_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2, request) => {
      hooks.handleError({ error: error2, request });
      error2.stack = options.get_stack(error2);
    },
    hooks,
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    prerender: true,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
async function load_component(file) {
  const { entry, css: css22, js, styles } = metadata_lookup[file];
  return {
    module: await module_lookup[file](),
    entry: assets + "/_app/" + entry,
    css: css22.map((dep) => assets + "/_app/" + dep),
    js: js.map((dep) => assets + "/_app/" + dep),
    styles
  };
}
function render(request, {
  prerender
} = {}) {
  const host = request.headers["host"];
  return respond(__spreadProps(__spreadValues({}, request), { host }), options, { prerender });
}
var current_component, escaped2, missing_component, on_destroy, css4, Root, base, assets, handle, user_hooks, template, options, default_settings, d, empty, manifest, get_hooks, module_lookup, metadata_lookup;
var init_app_d23b9461 = __esm({
  ".svelte-kit/output/server/chunks/app-d23b9461.js"() {
    init_shims();
    init_ssr();
    Promise.resolve();
    escaped2 = {
      '"': "&quot;",
      "'": "&#39;",
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;"
    };
    missing_component = {
      $$render: () => ""
    };
    css4 = {
      code: "#svelte-announcer.svelte-14w5w0p{position:absolute;left:0;top:0;clip:rect(0 0 0 0);-webkit-clip-path:inset(50%);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
      map: null
    };
    Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { stores } = $$props;
      let { page } = $$props;
      let { components } = $$props;
      let { props_0 = null } = $$props;
      let { props_1 = null } = $$props;
      let { props_2 = null } = $$props;
      setContext("__svelte__", stores);
      afterUpdate(stores.page.notify);
      if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
        $$bindings.stores(stores);
      if ($$props.page === void 0 && $$bindings.page && page !== void 0)
        $$bindings.page(page);
      if ($$props.components === void 0 && $$bindings.components && components !== void 0)
        $$bindings.components(components);
      if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
        $$bindings.props_0(props_0);
      if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
        $$bindings.props_1(props_1);
      if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
        $$bindings.props_2(props_2);
      $$result.css.add(css4);
      {
        stores.page.set(page);
      }
      return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
        default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
          default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
        })}` : ``}`
      })}

${``}`;
    });
    base = "";
    assets = "";
    handle = async ({ request, resolve: resolve3 }) => {
      const cookies = cookie.parse(request.headers.cookie || "");
      request.locals.userid = cookies.userid || v4();
      if (request.query.has("_method")) {
        request.method = request.query.get("_method").toUpperCase();
      }
      const response = await resolve3(request);
      if (!cookies.userid) {
        response.headers["set-cookie"] = `userid=${request.locals.userid}; Path=/; HttpOnly`;
      }
      return response;
    };
    user_hooks = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      [Symbol.toStringTag]: "Module",
      handle
    });
    template = ({ head, body }) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="/favicon.png" />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n\n		' + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
    options = null;
    default_settings = { paths: { "base": "", "assets": "" } };
    d = (s2) => s2.replace(/%23/g, "#").replace(/%3[Bb]/g, ";").replace(/%2[Cc]/g, ",").replace(/%2[Ff]/g, "/").replace(/%3[Ff]/g, "?").replace(/%3[Aa]/g, ":").replace(/%40/g, "@").replace(/%26/g, "&").replace(/%3[Dd]/g, "=").replace(/%2[Bb]/g, "+").replace(/%24/g, "$");
    empty = () => ({});
    manifest = {
      assets: [{ "file": "favicon.png", "size": 1571, "type": "image/png" }, { "file": "logo.png", "size": 12175, "type": "image/png" }, { "file": "robots.txt", "size": 67, "type": "text/plain" }, { "file": "svelte-welcome.png", "size": 360807, "type": "image/png" }, { "file": "svelte-welcome.webp", "size": 115470, "type": "image/webp" }],
      layout: "src/routes/__layout.svelte",
      error: "src/routes/__error.svelte",
      routes: [
        {
          type: "page",
          pattern: /^\/$/,
          params: empty,
          a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
          b: ["src/routes/__error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/projects\/([^/]+?)\/?$/,
          params: (m) => ({ slug: d(m[1]) }),
          a: ["src/routes/__layout.svelte", "src/routes/projects/[slug].svelte"],
          b: ["src/routes/__error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/login\/?$/,
          params: empty,
          a: ["src/routes/__layout.svelte", "src/routes/login.svelte"],
          b: ["src/routes/__error.svelte"]
        },
        {
          type: "endpoint",
          pattern: /^\/posts\/?$/,
          params: empty,
          load: () => Promise.resolve().then(() => (init_posts_ecb4c61f(), posts_ecb4c61f_exports))
        },
        {
          type: "page",
          pattern: /^\/new\/?$/,
          params: empty,
          a: ["src/routes/__layout.svelte", "src/routes/new.svelte"],
          b: ["src/routes/__error.svelte"]
        }
      ]
    };
    get_hooks = (hooks) => ({
      getSession: hooks.getSession || (() => ({})),
      handle: hooks.handle || (({ request, resolve: resolve3 }) => resolve3(request)),
      handleError: hooks.handleError || (({ error: error2 }) => console.error(error2.stack)),
      externalFetch: hooks.externalFetch || fetch
    });
    module_lookup = {
      "src/routes/__layout.svelte": () => Promise.resolve().then(() => (init_layout_1d839b61(), layout_1d839b61_exports)),
      "src/routes/__error.svelte": () => Promise.resolve().then(() => (init_error_201546fd(), error_201546fd_exports)),
      "src/routes/index.svelte": () => Promise.resolve().then(() => (init_index_d06c234b(), index_d06c234b_exports)),
      "src/routes/projects/[slug].svelte": () => Promise.resolve().then(() => (init_slug_e980138e(), slug_e980138e_exports)),
      "src/routes/login.svelte": () => Promise.resolve().then(() => (init_login_29038ea0(), login_29038ea0_exports)),
      "src/routes/new.svelte": () => Promise.resolve().then(() => (init_new_cb2804ab(), new_cb2804ab_exports))
    };
    metadata_lookup = { "src/routes/__layout.svelte": { "entry": "pages/__layout.svelte-99437a79.js", "css": ["assets/pages/__layout.svelte-e8d3001c.css", "assets/vendor-44e2f755.css"], "js": ["pages/__layout.svelte-99437a79.js", "chunks/vendor-7b1553fa.js", "chunks/user-1d418f0f.js"], "styles": [] }, "src/routes/__error.svelte": { "entry": "pages/__error.svelte-4d44dc9e.js", "css": ["assets/vendor-44e2f755.css"], "js": ["pages/__error.svelte-4d44dc9e.js", "chunks/vendor-7b1553fa.js"], "styles": [] }, "src/routes/index.svelte": { "entry": "pages/index.svelte-701af458.js", "css": ["assets/vendor-44e2f755.css"], "js": ["pages/index.svelte-701af458.js", "chunks/vendor-7b1553fa.js", "chunks/user-1d418f0f.js", "chunks/navigation-51f4a605.js", "chunks/singletons-12a22614.js"], "styles": [] }, "src/routes/projects/[slug].svelte": { "entry": "pages/projects/_slug_.svelte-319a6b81.js", "css": ["assets/vendor-44e2f755.css"], "js": ["pages/projects/_slug_.svelte-319a6b81.js", "chunks/preload-helper-ec9aa979.js", "chunks/vendor-7b1553fa.js", "chunks/navigation-51f4a605.js", "chunks/singletons-12a22614.js", "chunks/user-1d418f0f.js"], "styles": [] }, "src/routes/login.svelte": { "entry": "pages/login.svelte-8204e2e0.js", "css": ["assets/pages/login.svelte-f50f5582.css", "assets/vendor-44e2f755.css"], "js": ["pages/login.svelte-8204e2e0.js", "chunks/vendor-7b1553fa.js", "chunks/navigation-51f4a605.js", "chunks/singletons-12a22614.js", "chunks/user-1d418f0f.js"], "styles": [] }, "src/routes/new.svelte": { "entry": "pages/new.svelte-587873b8.js", "css": ["assets/pages/new.svelte-d9f20f5f.css", "assets/vendor-44e2f755.css"], "js": ["pages/new.svelte-587873b8.js", "chunks/vendor-7b1553fa.js", "chunks/user-1d418f0f.js", "chunks/navigation-51f4a605.js", "chunks/singletons-12a22614.js"], "styles": [] } };
  }
});

// .svelte-kit/node/middlewares.js
init_shims();

// .svelte-kit/output/server/app.js
init_shims();
init_ssr();
init_app_d23b9461();
import "cookie";
import "@lukeed/uuid";

// .svelte-kit/node/middlewares.js
import {
  createReadStream,
  existsSync,
  statSync
} from "fs";
import fs__default, { readdirSync, statSync as statSync2 } from "fs";
import { resolve as resolve2, join, normalize as normalize3, dirname } from "path";
import {
  parse
} from "querystring";
import { fileURLToPath } from "url";
function getRawBody(req) {
  return new Promise((fulfil, reject) => {
    const h = req.headers;
    if (!h["content-type"]) {
      return fulfil(null);
    }
    req.on("error", reject);
    const length = Number(h["content-length"]);
    if (isNaN(length) && h["transfer-encoding"] == null) {
      return fulfil(null);
    }
    let data = new Uint8Array(length || 0);
    if (length > 0) {
      let offset = 0;
      req.on("data", (chunk) => {
        const new_len = offset + Buffer.byteLength(chunk);
        if (new_len > length) {
          return reject({
            status: 413,
            reason: 'Exceeded "Content-Length" limit'
          });
        }
        data.set(chunk, offset);
        offset = new_len;
      });
    } else {
      req.on("data", (chunk) => {
        const new_data = new Uint8Array(data.length + chunk.length);
        new_data.set(data, 0);
        new_data.set(chunk, data.length);
        data = new_data;
      });
    }
    req.on("end", () => {
      fulfil(data);
    });
  });
}
function create_kit_middleware({ render: render2 }) {
  return async (req, res) => {
    let parsed;
    try {
      parsed = new URL(req.url || "", "http://localhost");
    } catch (e) {
      res.statusCode = 400;
      return res.end("Invalid URL");
    }
    let body;
    try {
      body = await getRawBody(req);
    } catch (err) {
      res.statusCode = err.status || 400;
      return res.end(err.reason || "Invalid request body");
    }
    const rendered = await render2({
      method: req.method,
      headers: req.headers,
      path: parsed.pathname,
      query: parsed.searchParams,
      rawBody: body
    });
    if (rendered) {
      res.writeHead(rendered.status, rendered.headers);
      if (rendered.body) {
        res.write(rendered.body);
      }
      res.end();
    } else {
      res.statusCode = 404;
      res.end("Not found");
    }
  };
}
function parse2(req) {
  let raw = req.url;
  if (raw == null)
    return;
  let prev = req._parsedUrl;
  if (prev && prev.raw === raw)
    return prev;
  let pathname = raw, search = "", query;
  if (raw.length > 1) {
    let idx = raw.indexOf("?", 1);
    if (idx !== -1) {
      search = raw.substring(idx);
      pathname = raw.substring(0, idx);
      if (search.length > 1) {
        query = parse(search.substring(1));
      }
    }
  }
  return req._parsedUrl = { pathname, search, query, raw };
}
function list(dir, callback, pre = "") {
  dir = resolve2(".", dir);
  let arr = readdirSync(dir);
  let i = 0, abs, stats;
  for (; i < arr.length; i++) {
    abs = join(dir, arr[i]);
    stats = statSync2(abs);
    stats.isDirectory() ? list(abs, callback, join(pre, arr[i])) : callback(join(pre, arr[i]), abs, stats);
  }
}
var mimes = {
  "ez": "application/andrew-inset",
  "aw": "application/applixware",
  "atom": "application/atom+xml",
  "atomcat": "application/atomcat+xml",
  "atomdeleted": "application/atomdeleted+xml",
  "atomsvc": "application/atomsvc+xml",
  "dwd": "application/atsc-dwd+xml",
  "held": "application/atsc-held+xml",
  "rsat": "application/atsc-rsat+xml",
  "bdoc": "application/bdoc",
  "xcs": "application/calendar+xml",
  "ccxml": "application/ccxml+xml",
  "cdfx": "application/cdfx+xml",
  "cdmia": "application/cdmi-capability",
  "cdmic": "application/cdmi-container",
  "cdmid": "application/cdmi-domain",
  "cdmio": "application/cdmi-object",
  "cdmiq": "application/cdmi-queue",
  "cu": "application/cu-seeme",
  "mpd": "application/dash+xml",
  "davmount": "application/davmount+xml",
  "dbk": "application/docbook+xml",
  "dssc": "application/dssc+der",
  "xdssc": "application/dssc+xml",
  "es": "application/ecmascript",
  "ecma": "application/ecmascript",
  "emma": "application/emma+xml",
  "emotionml": "application/emotionml+xml",
  "epub": "application/epub+zip",
  "exi": "application/exi",
  "fdt": "application/fdt+xml",
  "pfr": "application/font-tdpfr",
  "geojson": "application/geo+json",
  "gml": "application/gml+xml",
  "gpx": "application/gpx+xml",
  "gxf": "application/gxf",
  "gz": "application/gzip",
  "hjson": "application/hjson",
  "stk": "application/hyperstudio",
  "ink": "application/inkml+xml",
  "inkml": "application/inkml+xml",
  "ipfix": "application/ipfix",
  "its": "application/its+xml",
  "jar": "application/java-archive",
  "war": "application/java-archive",
  "ear": "application/java-archive",
  "ser": "application/java-serialized-object",
  "class": "application/java-vm",
  "js": "application/javascript",
  "mjs": "application/javascript",
  "json": "application/json",
  "map": "application/json",
  "json5": "application/json5",
  "jsonml": "application/jsonml+json",
  "jsonld": "application/ld+json",
  "lgr": "application/lgr+xml",
  "lostxml": "application/lost+xml",
  "hqx": "application/mac-binhex40",
  "cpt": "application/mac-compactpro",
  "mads": "application/mads+xml",
  "webmanifest": "application/manifest+json",
  "mrc": "application/marc",
  "mrcx": "application/marcxml+xml",
  "ma": "application/mathematica",
  "nb": "application/mathematica",
  "mb": "application/mathematica",
  "mathml": "application/mathml+xml",
  "mbox": "application/mbox",
  "mscml": "application/mediaservercontrol+xml",
  "metalink": "application/metalink+xml",
  "meta4": "application/metalink4+xml",
  "mets": "application/mets+xml",
  "maei": "application/mmt-aei+xml",
  "musd": "application/mmt-usd+xml",
  "mods": "application/mods+xml",
  "m21": "application/mp21",
  "mp21": "application/mp21",
  "mp4s": "application/mp4",
  "m4p": "application/mp4",
  "doc": "application/msword",
  "dot": "application/msword",
  "mxf": "application/mxf",
  "nq": "application/n-quads",
  "nt": "application/n-triples",
  "cjs": "application/node",
  "bin": "application/octet-stream",
  "dms": "application/octet-stream",
  "lrf": "application/octet-stream",
  "mar": "application/octet-stream",
  "so": "application/octet-stream",
  "dist": "application/octet-stream",
  "distz": "application/octet-stream",
  "pkg": "application/octet-stream",
  "bpk": "application/octet-stream",
  "dump": "application/octet-stream",
  "elc": "application/octet-stream",
  "deploy": "application/octet-stream",
  "exe": "application/octet-stream",
  "dll": "application/octet-stream",
  "deb": "application/octet-stream",
  "dmg": "application/octet-stream",
  "iso": "application/octet-stream",
  "img": "application/octet-stream",
  "msi": "application/octet-stream",
  "msp": "application/octet-stream",
  "msm": "application/octet-stream",
  "buffer": "application/octet-stream",
  "oda": "application/oda",
  "opf": "application/oebps-package+xml",
  "ogx": "application/ogg",
  "omdoc": "application/omdoc+xml",
  "onetoc": "application/onenote",
  "onetoc2": "application/onenote",
  "onetmp": "application/onenote",
  "onepkg": "application/onenote",
  "oxps": "application/oxps",
  "relo": "application/p2p-overlay+xml",
  "xer": "application/patch-ops-error+xml",
  "pdf": "application/pdf",
  "pgp": "application/pgp-encrypted",
  "asc": "application/pgp-signature",
  "sig": "application/pgp-signature",
  "prf": "application/pics-rules",
  "p10": "application/pkcs10",
  "p7m": "application/pkcs7-mime",
  "p7c": "application/pkcs7-mime",
  "p7s": "application/pkcs7-signature",
  "p8": "application/pkcs8",
  "ac": "application/pkix-attr-cert",
  "cer": "application/pkix-cert",
  "crl": "application/pkix-crl",
  "pkipath": "application/pkix-pkipath",
  "pki": "application/pkixcmp",
  "pls": "application/pls+xml",
  "ai": "application/postscript",
  "eps": "application/postscript",
  "ps": "application/postscript",
  "provx": "application/provenance+xml",
  "cww": "application/prs.cww",
  "pskcxml": "application/pskc+xml",
  "raml": "application/raml+yaml",
  "rdf": "application/rdf+xml",
  "owl": "application/rdf+xml",
  "rif": "application/reginfo+xml",
  "rnc": "application/relax-ng-compact-syntax",
  "rl": "application/resource-lists+xml",
  "rld": "application/resource-lists-diff+xml",
  "rs": "application/rls-services+xml",
  "rapd": "application/route-apd+xml",
  "sls": "application/route-s-tsid+xml",
  "rusd": "application/route-usd+xml",
  "gbr": "application/rpki-ghostbusters",
  "mft": "application/rpki-manifest",
  "roa": "application/rpki-roa",
  "rsd": "application/rsd+xml",
  "rss": "application/rss+xml",
  "rtf": "application/rtf",
  "sbml": "application/sbml+xml",
  "scq": "application/scvp-cv-request",
  "scs": "application/scvp-cv-response",
  "spq": "application/scvp-vp-request",
  "spp": "application/scvp-vp-response",
  "sdp": "application/sdp",
  "senmlx": "application/senml+xml",
  "sensmlx": "application/sensml+xml",
  "setpay": "application/set-payment-initiation",
  "setreg": "application/set-registration-initiation",
  "shf": "application/shf+xml",
  "siv": "application/sieve",
  "sieve": "application/sieve",
  "smi": "application/smil+xml",
  "smil": "application/smil+xml",
  "rq": "application/sparql-query",
  "srx": "application/sparql-results+xml",
  "gram": "application/srgs",
  "grxml": "application/srgs+xml",
  "sru": "application/sru+xml",
  "ssdl": "application/ssdl+xml",
  "ssml": "application/ssml+xml",
  "swidtag": "application/swid+xml",
  "tei": "application/tei+xml",
  "teicorpus": "application/tei+xml",
  "tfi": "application/thraud+xml",
  "tsd": "application/timestamped-data",
  "toml": "application/toml",
  "trig": "application/trig",
  "ttml": "application/ttml+xml",
  "ubj": "application/ubjson",
  "rsheet": "application/urc-ressheet+xml",
  "td": "application/urc-targetdesc+xml",
  "vxml": "application/voicexml+xml",
  "wasm": "application/wasm",
  "wgt": "application/widget",
  "hlp": "application/winhlp",
  "wsdl": "application/wsdl+xml",
  "wspolicy": "application/wspolicy+xml",
  "xaml": "application/xaml+xml",
  "xav": "application/xcap-att+xml",
  "xca": "application/xcap-caps+xml",
  "xdf": "application/xcap-diff+xml",
  "xel": "application/xcap-el+xml",
  "xns": "application/xcap-ns+xml",
  "xenc": "application/xenc+xml",
  "xhtml": "application/xhtml+xml",
  "xht": "application/xhtml+xml",
  "xlf": "application/xliff+xml",
  "xml": "application/xml",
  "xsl": "application/xml",
  "xsd": "application/xml",
  "rng": "application/xml",
  "dtd": "application/xml-dtd",
  "xop": "application/xop+xml",
  "xpl": "application/xproc+xml",
  "xslt": "application/xml",
  "xspf": "application/xspf+xml",
  "mxml": "application/xv+xml",
  "xhvml": "application/xv+xml",
  "xvml": "application/xv+xml",
  "xvm": "application/xv+xml",
  "yang": "application/yang",
  "yin": "application/yin+xml",
  "zip": "application/zip",
  "3gpp": "video/3gpp",
  "adp": "audio/adpcm",
  "amr": "audio/amr",
  "au": "audio/basic",
  "snd": "audio/basic",
  "mid": "audio/midi",
  "midi": "audio/midi",
  "kar": "audio/midi",
  "rmi": "audio/midi",
  "mxmf": "audio/mobile-xmf",
  "mp3": "audio/mpeg",
  "m4a": "audio/mp4",
  "mp4a": "audio/mp4",
  "mpga": "audio/mpeg",
  "mp2": "audio/mpeg",
  "mp2a": "audio/mpeg",
  "m2a": "audio/mpeg",
  "m3a": "audio/mpeg",
  "oga": "audio/ogg",
  "ogg": "audio/ogg",
  "spx": "audio/ogg",
  "opus": "audio/ogg",
  "s3m": "audio/s3m",
  "sil": "audio/silk",
  "wav": "audio/wav",
  "weba": "audio/webm",
  "xm": "audio/xm",
  "ttc": "font/collection",
  "otf": "font/otf",
  "ttf": "font/ttf",
  "woff": "font/woff",
  "woff2": "font/woff2",
  "exr": "image/aces",
  "apng": "image/apng",
  "avif": "image/avif",
  "bmp": "image/bmp",
  "cgm": "image/cgm",
  "drle": "image/dicom-rle",
  "emf": "image/emf",
  "fits": "image/fits",
  "g3": "image/g3fax",
  "gif": "image/gif",
  "heic": "image/heic",
  "heics": "image/heic-sequence",
  "heif": "image/heif",
  "heifs": "image/heif-sequence",
  "hej2": "image/hej2k",
  "hsj2": "image/hsj2",
  "ief": "image/ief",
  "jls": "image/jls",
  "jp2": "image/jp2",
  "jpg2": "image/jp2",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "jpe": "image/jpeg",
  "jph": "image/jph",
  "jhc": "image/jphc",
  "jpm": "image/jpm",
  "jpx": "image/jpx",
  "jpf": "image/jpx",
  "jxr": "image/jxr",
  "jxra": "image/jxra",
  "jxrs": "image/jxrs",
  "jxs": "image/jxs",
  "jxsc": "image/jxsc",
  "jxsi": "image/jxsi",
  "jxss": "image/jxss",
  "ktx": "image/ktx",
  "ktx2": "image/ktx2",
  "png": "image/png",
  "btif": "image/prs.btif",
  "pti": "image/prs.pti",
  "sgi": "image/sgi",
  "svg": "image/svg+xml",
  "svgz": "image/svg+xml",
  "t38": "image/t38",
  "tif": "image/tiff",
  "tiff": "image/tiff",
  "tfx": "image/tiff-fx",
  "webp": "image/webp",
  "wmf": "image/wmf",
  "disposition-notification": "message/disposition-notification",
  "u8msg": "message/global",
  "u8dsn": "message/global-delivery-status",
  "u8mdn": "message/global-disposition-notification",
  "u8hdr": "message/global-headers",
  "eml": "message/rfc822",
  "mime": "message/rfc822",
  "3mf": "model/3mf",
  "gltf": "model/gltf+json",
  "glb": "model/gltf-binary",
  "igs": "model/iges",
  "iges": "model/iges",
  "msh": "model/mesh",
  "mesh": "model/mesh",
  "silo": "model/mesh",
  "mtl": "model/mtl",
  "obj": "model/obj",
  "stpz": "model/step+zip",
  "stpxz": "model/step-xml+zip",
  "stl": "model/stl",
  "wrl": "model/vrml",
  "vrml": "model/vrml",
  "x3db": "model/x3d+fastinfoset",
  "x3dbz": "model/x3d+binary",
  "x3dv": "model/x3d-vrml",
  "x3dvz": "model/x3d+vrml",
  "x3d": "model/x3d+xml",
  "x3dz": "model/x3d+xml",
  "appcache": "text/cache-manifest",
  "manifest": "text/cache-manifest",
  "ics": "text/calendar",
  "ifb": "text/calendar",
  "coffee": "text/coffeescript",
  "litcoffee": "text/coffeescript",
  "css": "text/css",
  "csv": "text/csv",
  "html": "text/html",
  "htm": "text/html",
  "shtml": "text/html",
  "jade": "text/jade",
  "jsx": "text/jsx",
  "less": "text/less",
  "markdown": "text/markdown",
  "md": "text/markdown",
  "mml": "text/mathml",
  "mdx": "text/mdx",
  "n3": "text/n3",
  "txt": "text/plain",
  "text": "text/plain",
  "conf": "text/plain",
  "def": "text/plain",
  "list": "text/plain",
  "log": "text/plain",
  "in": "text/plain",
  "ini": "text/plain",
  "dsc": "text/prs.lines.tag",
  "rtx": "text/richtext",
  "sgml": "text/sgml",
  "sgm": "text/sgml",
  "shex": "text/shex",
  "slim": "text/slim",
  "slm": "text/slim",
  "spdx": "text/spdx",
  "stylus": "text/stylus",
  "styl": "text/stylus",
  "tsv": "text/tab-separated-values",
  "t": "text/troff",
  "tr": "text/troff",
  "roff": "text/troff",
  "man": "text/troff",
  "me": "text/troff",
  "ms": "text/troff",
  "ttl": "text/turtle",
  "uri": "text/uri-list",
  "uris": "text/uri-list",
  "urls": "text/uri-list",
  "vcard": "text/vcard",
  "vtt": "text/vtt",
  "yaml": "text/yaml",
  "yml": "text/yaml",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  "h261": "video/h261",
  "h263": "video/h263",
  "h264": "video/h264",
  "m4s": "video/iso.segment",
  "jpgv": "video/jpeg",
  "jpgm": "image/jpm",
  "mj2": "video/mj2",
  "mjp2": "video/mj2",
  "ts": "video/mp2t",
  "mp4": "video/mp4",
  "mp4v": "video/mp4",
  "mpg4": "video/mp4",
  "mpeg": "video/mpeg",
  "mpg": "video/mpeg",
  "mpe": "video/mpeg",
  "m1v": "video/mpeg",
  "m2v": "video/mpeg",
  "ogv": "video/ogg",
  "qt": "video/quicktime",
  "mov": "video/quicktime",
  "webm": "video/webm"
};
function lookup(extn) {
  let tmp = ("" + extn).trim().toLowerCase();
  let idx = tmp.lastIndexOf(".");
  return mimes[!~idx ? tmp : tmp.substring(++idx)];
}
var noop3 = () => {
};
function isMatch(uri, arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].test(uri))
      return true;
  }
}
function toAssume(uri, extns) {
  let i = 0, x, len = uri.length - 1;
  if (uri.charCodeAt(len) === 47) {
    uri = uri.substring(0, len);
  }
  let arr = [], tmp = `${uri}/index`;
  for (; i < extns.length; i++) {
    x = extns[i] ? `.${extns[i]}` : "";
    if (uri)
      arr.push(uri + x);
    arr.push(tmp + x);
  }
  return arr;
}
function viaCache(cache, uri, extns) {
  let i = 0, data, arr = toAssume(uri, extns);
  for (; i < arr.length; i++) {
    if (data = cache[arr[i]])
      return data;
  }
}
function viaLocal(dir, isEtag, uri, extns) {
  let i = 0, arr = toAssume(uri, extns);
  let abs, stats, name, headers;
  for (; i < arr.length; i++) {
    abs = normalize3(join(dir, name = arr[i]));
    if (abs.startsWith(dir) && existsSync(abs)) {
      stats = statSync(abs);
      if (stats.isDirectory())
        continue;
      headers = toHeaders(name, stats, isEtag);
      headers["Cache-Control"] = isEtag ? "no-cache" : "no-store";
      return { abs, stats, headers };
    }
  }
}
function is404(req, res) {
  return res.statusCode = 404, res.end();
}
function send(req, res, file, stats, headers) {
  let code = 200, tmp, opts = {};
  headers = __spreadValues({}, headers);
  for (let key in headers) {
    tmp = res.getHeader(key);
    if (tmp)
      headers[key] = tmp;
  }
  if (tmp = res.getHeader("content-type")) {
    headers["Content-Type"] = tmp;
  }
  if (req.headers.range) {
    code = 206;
    let [x, y] = req.headers.range.replace("bytes=", "").split("-");
    let end = opts.end = parseInt(y, 10) || stats.size - 1;
    let start = opts.start = parseInt(x, 10) || 0;
    if (start >= stats.size || end >= stats.size) {
      res.setHeader("Content-Range", `bytes */${stats.size}`);
      res.statusCode = 416;
      return res.end();
    }
    headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`;
    headers["Content-Length"] = end - start + 1;
    headers["Accept-Ranges"] = "bytes";
  }
  res.writeHead(code, headers);
  createReadStream(file, opts).pipe(res);
}
var ENCODING = {
  ".br": "br",
  ".gz": "gzip"
};
function toHeaders(name, stats, isEtag) {
  let enc = ENCODING[name.slice(-3)];
  let ctype = lookup(name.slice(0, enc && -3)) || "";
  if (ctype === "text/html")
    ctype += ";charset=utf-8";
  let headers = {
    "Content-Length": stats.size,
    "Content-Type": ctype,
    "Last-Modified": stats.mtime.toUTCString()
  };
  if (enc)
    headers["Content-Encoding"] = enc;
  if (isEtag)
    headers["ETag"] = `W/"${stats.size}-${stats.mtime.getTime()}"`;
  return headers;
}
function sirv(dir, opts = {}) {
  dir = resolve2(dir || ".");
  let isNotFound = opts.onNoMatch || is404;
  let setHeaders = opts.setHeaders || noop3;
  let extensions = opts.extensions || ["html", "htm"];
  let gzips = opts.gzip && extensions.map((x) => `${x}.gz`).concat("gz");
  let brots = opts.brotli && extensions.map((x) => `${x}.br`).concat("br");
  const FILES = {};
  let fallback = "/";
  let isEtag = !!opts.etag;
  let isSPA = !!opts.single;
  if (typeof opts.single === "string") {
    let idx = opts.single.lastIndexOf(".");
    fallback += !!~idx ? opts.single.substring(0, idx) : opts.single;
  }
  let ignores = [];
  if (opts.ignores !== false) {
    ignores.push(/[/]([A-Za-z\s\d~$._-]+\.\w+){1,}$/);
    if (opts.dotfiles)
      ignores.push(/\/\.\w/);
    else
      ignores.push(/\/\.well-known/);
    [].concat(opts.ignores || []).forEach((x) => {
      ignores.push(new RegExp(x, "i"));
    });
  }
  let cc = opts.maxAge != null && `public,max-age=${opts.maxAge}`;
  if (cc && opts.immutable)
    cc += ",immutable";
  else if (cc && opts.maxAge === 0)
    cc += ",must-revalidate";
  if (!opts.dev) {
    list(dir, (name, abs, stats) => {
      if (/\.well-known[\\+\/]/.test(name))
        ;
      else if (!opts.dotfiles && /(^\.|[\\+|\/+]\.)/.test(name))
        return;
      let headers = toHeaders(name, stats, isEtag);
      if (cc)
        headers["Cache-Control"] = cc;
      FILES["/" + name.normalize().replace(/\\+/g, "/")] = { abs, stats, headers };
    });
  }
  let lookup2 = opts.dev ? viaLocal.bind(0, dir, isEtag) : viaCache.bind(0, FILES);
  return function(req, res, next) {
    let extns = [""];
    let pathname = parse2(req).pathname;
    let val = req.headers["accept-encoding"] || "";
    if (gzips && val.includes("gzip"))
      extns.unshift(...gzips);
    if (brots && /(br|brotli)/i.test(val))
      extns.unshift(...brots);
    extns.push(...extensions);
    if (pathname.indexOf("%") !== -1) {
      try {
        pathname = decodeURIComponent(pathname);
      } catch (err) {
      }
    }
    let data = lookup2(pathname, extns) || isSPA && !isMatch(pathname, ignores) && lookup2(fallback, extns);
    if (!data)
      return next ? next() : isNotFound(req, res);
    if (isEtag && req.headers["if-none-match"] === data.headers["ETag"]) {
      res.writeHead(304);
      return res.end();
    }
    if (gzips || brots) {
      res.setHeader("Vary", "Accept-Encoding");
    }
    setHeaders(res, pathname, data.stats);
    send(req, res, data.abs, data.stats, data.headers);
  };
}
var __dirname = dirname(fileURLToPath(import.meta.url));
var noop_handler = (_req, _res, next) => next();
var paths = {
  assets: join(__dirname, "/assets"),
  prerendered: join(__dirname, "/prerendered")
};
var prerenderedMiddleware = fs__default.existsSync(paths.prerendered) ? sirv(paths.prerendered, {
  etag: true,
  maxAge: 0,
  gzip: true,
  brotli: true
}) : noop_handler;
var assetsMiddleware = fs__default.existsSync(paths.assets) ? sirv(paths.assets, {
  setHeaders: (res, pathname) => {
    if (pathname.startsWith("/_app/")) {
      res.setHeader("cache-control", "public, max-age=31536000, immutable");
    }
  },
  gzip: true,
  brotli: true
}) : noop_handler;
var kitMiddleware = function() {
  init();
  return create_kit_middleware({ render });
}();
export {
  assetsMiddleware,
  kitMiddleware,
  prerenderedMiddleware
};
/*! fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
