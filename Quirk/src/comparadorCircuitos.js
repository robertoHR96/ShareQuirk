const comparadorArraysCircuit = (circuitoOld, circuitoNew) => {
  // Verificamos que ambos arrays tengan la misma longitud
  if (circuitoOld.length !== circuitoNew.length) {
    return "Los arrays no tienen la misma longitud.";
  }

  // Iteramos sobre ambos arrays para comparar cada elemento
  for (let i = 0; i < circuitoOld.length; i++) {
    for (let j = 0; j < circuitoOld[i].length; j++) {
      if (circuitoOld[i][j] !== circuitoNew[i][j]) {
        return {
          x: i,
          y: j,
          element: circuitoNew[i][j],
          // mod: circuitoOld[i].length > ,
        };
      }
    }
  }

  return "Los arrays son iguales.";
};

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (let key of keysA) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

const getCreateCircuit = (circuitoNew) => {
  for (let i = 0; i < circuitoNew[0].length; i++) {
    if (circuitoNew[0][i] !== 1) {
      return {
        x: 0,
        y: i,
        element: circuitoNew[0][i],
        mod: "add",
       // uuid: crypto.randomUUID(),
      };
    }
  }
};

export const compareCircuit = (circuitoNew, circuitoOld, matrizUUIDs) => {
  // Creación del circuito
  if (circuitoOld[0] === undefined) {
    return getCreateCircuit(circuitoNew);
  }

  // Se añade un elemento y se crea una columna nueva
  if (circuitoNew.length > circuitoOld.length) {
    for (let i = 0; i < circuitoOld.length; i++) {
      if (!deepEqual(circuitoNew[i], circuitoOld[i])) {
        for (let e = 0; e < circuitoNew[i].length; e++) {
          if (circuitoNew[i][e] != 1) {
            return {
              x: i,
              y: e,
              element: circuitoNew[i][e],
              mod: "addWithColumn",
             // uuid: crypto.randomUUID(),
            };
          }
        }
      }
    }
    for (let e = 0; e < circuitoNew[circuitoNew.length - 1].length; e++) {
      if (circuitoNew[i][e] != 1) {
        return {
          x: i,
          y: e,
          element: circuitoNew[i][e],
          mod: "add",
          //uuid: crypto.randomUUID(),
        };
      }
    }
  }

  // Se eleimina un elemenot y se elimina na columna
  if (circuitoNew.length < circuitoOld.length) {
    for (let i = 0; i < circuitoOld.length; i++) {
      if (!deepEqual(circuitoNew[i], circuitoOld[i])) {
        for (let e = 0; e < circuitoOld[i].length; e++) {
          if (circuitoOld[i][e] != 1) {
            return {
              x: i,
              y: e,
              element: circuitoOld[i][e],
              mod: "remove",
              //uuid: matrizUUIDs[i][e],
            };
          }
        }
      }
    }
    for (let e = 0; e < circuitoOld[circuitoOld.length - 1].length; e++) {
      if (circuitoNew[i][e] != 1) {
        return {
          x: i,
          y: e,
          element: circuitoOld[i][e],
          mod: "remove",
          //uuid: matrizUUIDs[i][e],
        };
      }
    }
  }

  // cuando el numero del columnas es igual pero el de fils no lo es
  for (let i = 0; i < circuitoOld.length; i++) {
    if (!deepEqual(circuitoNew[i], circuitoOld[i])) {
      if (circuitoNew[i].length > circuitoOld[i].length) {
        return {
          x: i,
          y: circuitoNew[i].length - 1,
          element: circuitoNew[i][circuitoNew[i].length - 1],
          mod: "add",
         // uuid: crypto.randomUUID(),
        };
      }
      if (circuitoNew[i].length < circuitoOld[i].length) {
        return {
          x: i,
          y: circuitoOld[i].length - 1,
          element: circuitoOld[i][circuitoOld[i].length - 1],
          mod: "remove",
         // uuid: matrizUUIDs[i][circuitoOld[i].length - 1],
        };
      }
      // cuando el nuermo de columnas y filas es igual
      for (let e = 0; e < circuitoNew[i].length; e++) {
        if (circuitoNew[i][e] != circuitoOld[i][e]) {
          if (circuitoNew[i][e] != 1) {
            return {
              x: i,
              y: e,
              element: circuitoNew[i][e],
              mod: "add",
             // uuid: crypto.randomUUID(),
            };
          } else {
            return {
              x: i,
              y: e,
              element: circuitoOld[i][e],
              mod: "remove",
             //uuid: matrizUUIDs[i][e],
            };
          }
        }
      }
    }
  }
};
