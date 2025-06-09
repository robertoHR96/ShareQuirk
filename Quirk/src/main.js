/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// It's important that the polyfills and error fallback get loaded first!
import {} from "./browser/Polyfills.js";
import { hookErrorHandler } from "./fallback.js";
hookErrorHandler();
import { doDetectIssues } from "./issues.js";
doDetectIssues();

import { CircuitStats } from "./circuit/CircuitStats.js";
import { CooldownThrottle } from "./base/CooldownThrottle.js";
import { Config } from "./Config.js";
import { DisplayedInspector } from "./ui/DisplayedInspector.js";
import { Painter } from "./draw/Painter.js";
import { Rect } from "./math/Rect.js";
import { RestartableRng } from "./base/RestartableRng.js";
import { Revision } from "./base/Revision.js";
import {
  initSerializer,
  fromJsonText_CircuitDefinition,
} from "./circuit/Serializer.js";
import { TouchScrollBlocker } from "./browser/TouchScrollBlocker.js";
import { Util } from "./base/Util.js";
import { initializedWglContext } from "./webgl/WglContext.js";
import {
  watchDrags,
  isMiddleClicking,
  eventPosRelativeTo,
} from "./browser/MouseWatcher.js";
import { ObservableValue, ObservableSource } from "./base/Obs.js";
import { initExports, obsExportsIsShowing } from "./ui/exports.js";
import { initForge, obsForgeIsShowing } from "./ui/forge.js";
import { initMenu, obsMenuIsShowing, closeMenu } from "./ui/menu.js";
import { initUndoRedo } from "./ui/undo.js";
import { initClear } from "./ui/clear.js";
import { initUrlCircuitSync } from "./ui/url.js";
import { initTitleSync } from "./ui/title.js";
import { simulate } from "./ui/sim.js";
import { GatePainting } from "./draw/GatePainting.js";
import { GATE_CIRCUIT_DRAWER } from "./ui/DisplayedCircuit.js";
import { GateColumn } from "./circuit/GateColumn.js";
import { Point } from "./math/Point.js";

import { compareCircuit } from "./comparadorCircuitos.js";
import { comparateInti } from "./comparadorInti.js";

initSerializer(
  GatePainting.LABEL_DRAWER,
  GatePainting.MATRIX_DRAWER,
  GATE_CIRCUIT_DRAWER,
  GatePainting.LOCATION_INDEPENDENT_GATE_DRAWER
);
var matrizUUIDs = [[]];
const canvasDiv = document.getElementById("canvasDiv");

//noinspection JSValidateTypes
/** @type {!HTMLCanvasElement} */
const canvas = document.getElementById("drawCanvas");
//noinspection JSValidateTypes
if (!canvas) {
  throw new Error("Couldn't find 'drawCanvas'");
}
canvas.width = canvasDiv.clientWidth;
canvas.height = window.innerHeight * 0.9;
let haveLoaded = false;
const semiStableRng = (() => {
  const target = { cur: new RestartableRng() };
  let cycleRng;
  cycleRng = () => {
    target.cur = new RestartableRng();
    //noinspection DynamicallyGeneratedCodeJS
    setTimeout(
      cycleRng,
      Config.SEMI_STABLE_RANDOM_VALUE_LIFETIME_MILLIS * 0.99
    );
  };
  cycleRng();
  return target;
})();

//noinspection JSValidateTypes
/** @type {!HTMLDivElement} */
const inspectorDiv = document.getElementById("inspectorDiv");

/** @type {ObservableValue.<!DisplayedInspector>} */
const displayed = new ObservableValue(
  DisplayedInspector.empty(
    new Rect(0, 0, canvas.clientWidth, canvas.clientHeight)
  )
);
const mostRecentStats = new ObservableValue(CircuitStats.EMPTY);
/** @type {!Revision} */
let revision = Revision.startingAt(displayed.get().snapshot());

revision.latestActiveCommit().subscribe((jsonText) => {
  let circuitDef = fromJsonText_CircuitDefinition(jsonText);
  let newInspector = displayed.get().withCircuitDefinition(circuitDef);
  displayed.set(newInspector);
});

/**
 * @param {!DisplayedInspector} curInspector
 * @returns {{w: number, h: !number}}
 */
let desiredCanvasSizeFor = (curInspector) => {
  return {
    w: Math.max(canvasDiv.clientWidth, curInspector.desiredWidth()),
    h: curInspector.desiredHeight(),
  };
};

/**
 * @param {!DisplayedInspector} ins
 * @returns {!DisplayedInspector}
 */
const syncArea = (ins) => {
  let size = desiredCanvasSizeFor(ins);
  ins.updateArea(new Rect(0, 0, size.w, size.h));
  return ins;
};

// Gradually fade out old errors as user manipulates circuit.
displayed
  .observable()
  .map((e) => e.displayedCircuit.circuitDefinition)
  .whenDifferent(Util.CUSTOM_IS_EQUAL_TO_EQUALITY)
  .subscribe(() => {
    let errDivStyle = document.getElementById("error-div").style;
    errDivStyle.opacity *= 0.9;
    if (errDivStyle.opacity < 0.06) {
      errDivStyle.display = "None";
    }
  });

/** @type {!CooldownThrottle} */
let redrawThrottle;
const scrollBlocker = new TouchScrollBlocker(canvasDiv);
const redrawNow = () => {
  if (!haveLoaded) {
    // Don't draw while loading. It's a huge source of false-positive circuit-load-failed errors during development.
    return;
  }

  let shown = syncArea(displayed.get()).previewDrop();
  if (
    displayed.get().hand.isHoldingSomething() &&
    !shown.hand.isHoldingSomething()
  ) {
    shown = shown.withHand(
      shown.hand.withHeldGateColumn(new GateColumn([]), new Point(0, 0))
    );
  }
  let stats = simulate(shown.displayedCircuit.circuitDefinition);
  mostRecentStats.set(stats);

  let size = desiredCanvasSizeFor(shown);
  canvas.width = size.w;
  canvas.height = size.h;
  let painter = new Painter(canvas, semiStableRng.cur.restarted());
  shown.updateArea(painter.paintableArea());
  shown.paint(painter, stats);
  painter.paintDeferred();

  displayed.get().hand.paintCursor(painter);
  scrollBlocker.setBlockers(painter.touchBlockers, painter.desiredCursorStyle);
  canvas.style.cursor = painter.desiredCursorStyle || "auto";

  let dt = displayed.get().stableDuration();
  if (dt < Infinity) {
    window.requestAnimationFrame(() => redrawThrottle.trigger());
  }
};

redrawThrottle = new CooldownThrottle(
  redrawNow,
  Config.REDRAW_COOLDOWN_MILLIS,
  0.1,
  true
);
window.addEventListener("resize", () => redrawThrottle.trigger(), false);
displayed.observable().subscribe(() => redrawThrottle.trigger());

/********/
/********/

/********/
/**************** */
const sendActualCircuit = () => {
  // Obtiene el último estado del historial como objeto
  let circuitoNew = JSON.parse(
    revision.history[revision.history.length - 1]
  ).cols;

  // Filtra columnas vacías (que no sean arreglos o arreglos vacíos)
  circuitoNew = circuitoNew.filter(
    (item) => !Array.isArray(item) || item.length > 0
  );
  // Recorre todas las celdas del circuito
  for (let i = 0; i < circuitoNew.length; i++) {
    for (let e = 0; e < circuitoNew[i].length; e++) {
      // Si la celda no es "1", envía la celda como parte del circuito
      if (circuitoNew[i][e] != "1") {
        WebSocketManager.send({
          action: "sendCircuit",
          updateCircuit: {
            x: i,
            y: e,
            element: circuitoNew[i][e],
            mod: "add",
          },
          // Incluye también la información de puertas (gates)
          gates: JSON.parse(revision.history[revision.history.length - 1])
            .gates,
        });
      }
    }
  }
};
const sendAllCustomGates = () => {
  // Obtiene el último estado del historial como objeto
  try {
    let gates = JSON.parse(revision.history[revision.history.length - 1]);
    try {
      gates = gates.gates;
    } catch (error) {
      gates = undefined;
      console.error("Error al enviar las puertas personalizadas:", error);
    }
    if (gates == undefined || gates.length == 0) {
      console.error(
        "Error al enviar las puertas personalizadas:",
        "no hay puertas"
      );
      return null;
    }
    for (let i = 0; i < gates.length; i++) {
      console.log("Enviando puerta personalizada:", gates[i]);
      WebSocketManager.send({
        action: "sendGate",
        gate: gates[i],
        cod: WebSocketManager.cod,
      });
    }
    // Recorre todas las puertas (gates) y las envía
  } catch (error) {
    console.error("Error al enviar las puertas personalizadas:", error);
    // Manejo de error, por ejemplo, si no hay puertas personalizadas
    console.warn("No hay puertas personalizadas para enviar.");
  }
};

const sendAllInits = () => {
  const rhNew = JSON.parse(revision.history[revision.history.length - 1]);
  try {
    intiN = rhNew.init;
  } catch (e) {
    intiN = undefined;
  }
  if (intiN == undefined) {
    return null;
  }
  for (let i = 0; i < intiN.length; i++) {
    WebSocketManager.send({
      action: "sendInit",
      updateInit: {
        x: i,
        element: intiN[i],
        mod: "add",
      },
    });
  }
};

const WebSocketManager = {
  socket: null, // Instancia del WebSocket
  cod: null, // Código del circuito (ID)

  // Envia datos por WebSocket si está abierto
  send(payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Crea un nuevo objeto con el payload y el código
      const msg = Object.assign({}, payload, { cod: this.cod });
      this.socket.send(JSON.stringify(msg)); // Envía como string
    } else {
      console.warn("Socket no está abierto.");
    }
  },

  // Se conecta y crea un nuevo circuito
  connect(cod) {
    if (this.cod == null) {
      this.socket = new WebSocket("ws://localhost:8080/ws");

      this.socket.onopen = () => {};

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.action) {
            // Si recibe circuito, actualiza URL y filtra historial
            if (data.action === "reciveCircuit") {
              window.location.hash = "circuit=" + data.circuit;
            }
            // Si se creó el circuito, guarda código, muestra y envía datos
            if (data.action === "createCircuit") {
              //document.getElementById("codeShareCircuit").textContent =
              sendAllCustomGates();
              sendAllInits();
              sendActualCircuit(); // Envía el estado actual del circuito
            }
          }
        } catch (error) {
          console.error("Error al parsear el mensaje:", error);
        }
      };

      // Maneja cierre del socket
      this.socket.onclose = () => {
        console.info("Conexión cerrada");
        this.cod = null;
        this.socket = null;
      };
    }
  },

  // Entra a un circuito existente con código
  enterCircuit(codigo) {
    this.cod = codigo;
    this.socket = new WebSocket("ws://localhost:8080/ws");

    const msg = {
      action: "enterCircuit",
      cod: codigo,
    };

    this.socket.onopen = () => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(msg)); // Solicita entrar al circuito
      } else {
        console.warn("Socket no está abierto.");
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action) {
          // Recibe el circuito y actualiza URL + historial
          if (data.action === "reciveCircuit") {
            window.location.hash = "circuit=" + data.circuit;
          }

          // Si entró correctamente, guarda el código y estado
          if (data.action === "enterCircuit") {
            window.location.hash = "circuit=" + data.circuit;
          }

          if (data.action === "createCircuit") {
            sendAllInits();
            sendAllCustomGates();
            sendActualCircuit(); // Envía el estado actual del circuito
          }
        }
      } catch (error) {
        console.error("Error al parsear el mensaje:", error);
      }
    };

    this.socket.onclose = () => {
      console.info("Conexión cerrada");
      this.cod = null;
      this.socket = null;
    };
  },
  undo() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const msg = {
        action: "undoCircuit",
        cod: this.cod,
      };
      this.socket.send(JSON.stringify(msg));
    } else {
      revision.undo();
    }
  },
  redo() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const msg = {
        action: "redoCircuit",
        cod: this.cod,
      };
      this.socket.send(JSON.stringify(msg));
    } else {
      revision.redo();
    }
  },
  clear() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const msg = {
        action: "clearCircuit",
        cod: this.cod,
      };
      this.socket.send(JSON.stringify(msg));
    } else {
      window.location.hash = 'circuit={"cols": []}';
    }
  },
};
const hashParams = new URLSearchParams(window.location.hash.substring(1));

const id_cod = hashParams.get("cod");

if (id_cod !== null) {
  WebSocketManager.enterCircuit(id_cod);
}
// Se modifica el comportamiento de los botones de atras y alante
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");
undoButton.addEventListener("click", () => {
  WebSocketManager.undo();
});
redoButton.addEventListener("click", () => {
  WebSocketManager.redo();
});
// se hace lo mismo para el clear
const clearButtonCircuit = document.getElementById("clear-circuit-button");
clearButtonCircuit.addEventListener("click", () => {
  WebSocketManager.clear();
});
const clearButton = document.getElementById("clear-all-button");
clearButton.addEventListener("click", () => {
  WebSocketManager.clear();
});

// Al hacer clic en el botón de compartir circuito
const sharetButton = document.getElementById("shareCircuit");
sharetButton.addEventListener("click", () => {
  // Muestra el modal
  const shareCircuitModal = document.getElementById("shareCircuitModal");
  shareCircuitModal.style.display = "flex";
  // Se conecta y crea circuito
  const codeShareCircuit = document.getElementById("codeShareCircuit");
  codeShareCircuit.textContent = "Code circuit: " + WebSocketManager.cod;
  WebSocketManager.connect();
});

// Manejo del botón para entrar a un circuito existente
const enterCircuitModal = document.getElementById("enterCircuitModal");
const inputCircuitModal = document.getElementById("codCircuitInput");
const enterCircuit = document.getElementById("submitCircuitButton");

enterCircuit.addEventListener("click", () => {
  // Usa el código ingresado para unirse al circuito
  WebSocketManager.enterCircuit(inputCircuitModal.value);
  // Oculta el modal
  enterCircuitModal.style.display = "none";
});
// para crear el e
window.addEventListener("customGateCreated", (event) => {
  const id = event.detail.gate;

  const data = JSON.parse(revision.history.at(-1));

  // Buscar la puerta (gate) con el ID deseado
  const gateNew = data.gates.find((g) => g.id === id);

  WebSocketManager.send({
    action: "sendGate",
    gate: gateNew,
    cod: WebSocketManager.cod,
  });
});
window.addEventListener("beforeunload", function (e) {
  // Tu función o lógica aquí
  WebSocketManager.socket.close();

  // Mostrar un mensaje de confirmación (solo en navegadores que lo permitan)
  //e.preventDefault(); // Necesario para algunos navegadores
  //e.returnValue = ""; // Requerido por la especificación para activar el mensaje
});
/********/
/********/
/********/
/********/

/** @type {undefined|!string} */
let clickDownGateButtonKey = undefined;
canvasDiv.addEventListener("click", (ev) => {
  let pt = eventPosRelativeTo(ev, canvasDiv);
  let curInspector = displayed.get();
  if (curInspector.tryGetHandOverButtonKey() !== clickDownGateButtonKey) {
    return;
  }
  let clicked = syncArea(
    curInspector.withHand(curInspector.hand.withPos(pt))
  ).tryClick();
  if (clicked !== undefined) {
    revision.commit(clicked.afterTidyingUp().snapshot());

    let intiN;
    let intiO;
    const rhNew = JSON.parse(revision.history[revision.history.length - 1]);
    const rhOld = JSON.parse(revision.history[revision.history.length - 2]);
    try {
      intiN = rhNew.init;
    } catch (e) {
      intiN = undefined;
    }
    try {
      intiO = rhOld.init;
    } catch (e) {
      intiO = undefined;
    }
    let intiComparado = comparateInti(intiN, intiO);
    WebSocketManager.send({
      action: "sendInit",
      updateInit: intiComparado,
    });
  }
});

watchDrags(
  canvasDiv,
  /**
   * Grab
   * @param {!Point} pt
   * @param {!MouseEvent|!TouchEvent} ev
   */
  (pt, ev) => {
    let oldInspector = displayed.get();
    let newHand = oldInspector.hand.withPos(pt);
    let newInspector = syncArea(oldInspector.withHand(newHand));
    clickDownGateButtonKey =
      ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey
        ? undefined
        : newInspector.tryGetHandOverButtonKey();
    if (clickDownGateButtonKey !== undefined) {
      displayed.set(newInspector);
      return;
    }

    newInspector = newInspector.afterGrabbing(
      ev.shiftKey,
      ev.ctrlKey || ev.metaKey
    );
    if (
      displayed.get().isEqualTo(newInspector) ||
      !newInspector.hand.isBusy()
    ) {
      return;
    }

    // Add extra wire temporarily.
    revision.startedWorkingOnCommit();
    displayed.set(
      syncArea(
        oldInspector.withHand(newHand).withJustEnoughWires(newInspector.hand, 1)
      ).afterGrabbing(ev.shiftKey, ev.ctrlKey || ev.metaKey, false, ev.altKey)
    );

    ev.preventDefault();
  },
  /**
   * Cancel
   * @param {!MouseEvent|!TouchEvent} ev
   */
  (ev) => {
    revision.cancelCommitBeingWorkedOn();
    ev.preventDefault();
  },
  /**
   * Drag Cuando queremos eliminar un elemento
   * @param {undefined|!Point} pt
   * @param {!MouseEvent|!TouchEvent} ev
   */
  (pt, ev) => {
    if (!displayed.get().hand.isBusy()) {
      //return;
    }

    let newHand = displayed.get().hand.withPos(pt);
    let newInspector = displayed.get().withHand(newHand);

    if (
      revision.history[revision.history.length - 1] !== newInspector.snapshot()
    ) {
      displayed.set(newInspector);
      revision.commit(newInspector.snapshot());
      let circuitoNew = JSON.parse(
        revision.history[revision.history.length - 1]
      ).cols;
      let circuitoOld = JSON.parse(
        revision.history[revision.history.length - 2]
      ).cols;

      circuitoOld = circuitoOld.filter(
        (item) => !Array.isArray(item) || item.length > 0
      );
      circuitoNew = circuitoNew.filter(
        (item) => !Array.isArray(item) || item.length > 0
      );
      const updateCircuit = compareCircuit(
        circuitoNew,
        circuitoOld,
        matrizUUIDs
      );
      if (updateCircuit != null && updateCircuit != undefined) {
        // enviar las gates tambien
        WebSocketManager.send({
          action: "sendCircuit",
          updateCircuit: updateCircuit,
        });
        //listaEventos.push(updateCircuit);
      }
    }
    displayed.set(newInspector);
    // ev.preventDefault();
  },

  /**
   * Drop cuando añadimos un elemento
   * @param {undefined|!Point} pt
   * @param {!MouseEvent|!TouchEvent} ev
   */
  (pt, ev) => {
    if (!displayed.get().hand.isBusy()) {
      return;
    }

    let newHand = displayed.get().hand.withPos(pt);
    let newInspector = syncArea(displayed.get())
      .withHand(newHand)
      .afterDropping()
      .afterTidyingUp();
    let clearHand = newInspector.hand.withPos(undefined);
    let clearInspector = newInspector.withJustEnoughWires(clearHand, 0);
    revision.commit(clearInspector.snapshot());
    ev.preventDefault();
    if (revision.history.length > 1) {
      let circuitoNew = JSON.parse(
        revision.history[revision.history.length - 1]
      ).cols;
      let circuitoOld = JSON.parse(
        revision.history[revision.history.length - 2]
      ).cols;

      circuitoOld = circuitoOld.filter(
        (item) => !Array.isArray(item) || item.length > 0
      );
      circuitoNew = circuitoNew.filter(
        (item) => !Array.isArray(item) || item.length > 0
      );
      const updateCircuit = compareCircuit(
        circuitoNew,
        circuitoOld,
        matrizUUIDs
      );
      if (updateCircuit != null && updateCircuit != undefined) {
        WebSocketManager.send({
          action: "sendCircuit",
          updateCircuit: updateCircuit,
        });
      }
    }
  }
);
let ss = {
  cols: [[1, "Y"]],
  init: [0, 1],
};

// Middle-click to delete a gate.
canvasDiv.addEventListener("mousedown", (ev) => {
  if (!isMiddleClicking(ev)) {
    return;
  }
  let cur = syncArea(displayed.get());
  let initOver = cur.tryGetHandOverButtonKey();
  let newHand = cur.hand.withPos(eventPosRelativeTo(ev, canvas));
  let newInspector;
  if (initOver !== undefined && initOver.startsWith("wire-init-")) {
    let newCircuit =
      cur.displayedCircuit.circuitDefinition.withSwitchedInitialStateOn(
        parseInt(initOver.substr(10)),
        0
      );
    newInspector = cur
      .withCircuitDefinition(newCircuit)
      .withHand(newHand)
      .afterTidyingUp();
  } else {
    newInspector = cur
      .withHand(newHand)
      .afterGrabbing(false, false, true, false) // Grab the gate.
      .withHand(newHand) // Lose the gate.
      .afterTidyingUp()
      .withJustEnoughWires(newHand, 0);
  }
  if (!displayed.get().isEqualTo(newInspector)) {
    revision.commit(newInspector.snapshot());
    ev.preventDefault();
  }
});

// When mouse moves without dragging, track it (for showing hints and things).
canvasDiv.addEventListener("mousemove", (ev) => {
  if (!displayed.get().hand.isBusy()) {
    let newHand = displayed.get().hand.withPos(eventPosRelativeTo(ev, canvas));
    let newInspector = displayed.get().withHand(newHand);
    displayed.set(newInspector);
  }
});
canvasDiv.addEventListener("mouseleave", () => {
  if (!displayed.get().hand.isBusy()) {
    let newHand = displayed.get().hand.withPos(undefined);
    let newInspector = displayed.get().withHand(newHand);
    displayed.set(newInspector);
  }
});

let obsIsAnyOverlayShowing = new ObservableSource();
initUrlCircuitSync(revision);
initExports(revision, mostRecentStats, obsIsAnyOverlayShowing.observable());
initForge(revision, obsIsAnyOverlayShowing.observable());
// no se inician los botones undo redo
//initUndoRedo(revision, obsIsAnyOverlayShowing.observable());
// no se inicia el clear, se redefine
//initClear(revision, obsIsAnyOverlayShowing.observable());
initMenu(revision, obsIsAnyOverlayShowing.observable());
initTitleSync(revision);
obsForgeIsShowing
  .zipLatest(obsExportsIsShowing, (e1, e2) => e1 || e2)
  .zipLatest(obsMenuIsShowing, (e1, e2) => e1 || e2)
  .whenDifferent()
  .subscribe((e) => {
    obsIsAnyOverlayShowing.send(e);
    canvasDiv.tabIndex = e ? -1 : 0;
  });

// If the webgl initialization is going to fail, don't fail during the module loading phase.
haveLoaded = true;
setTimeout(() => {
  inspectorDiv.style.display = "block";
  redrawNow();
  document.getElementById("loading-div").style.display = "none";
  document.getElementById("close-menu-button").style.display = "block";
  if (!displayed.get().displayedCircuit.circuitDefinition.isEmpty()) {
    closeMenu();
  }

  try {
    initializedWglContext().onContextRestored = () => redrawThrottle.trigger();
  } catch (ex) {
    // If that failed, the user is already getting warnings about WebGL not being supported.
    // Just silently log it.
    console.error(ex);
  }
}, 0);
