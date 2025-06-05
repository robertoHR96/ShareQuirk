export const comparateInti = (intiN, intiO) => {
  // si anterior es undifined es que se a alañdi un init
  if (intiO == undefined) {
    return {
      x: intiN.length - 1,
      element: intiN[intiN.length - 1],
      mod: "add",
    };
  }
  if (intiN == undefined) {
    return {
      x: intiO.length - 1,
      element: intiO[intiO.length - 1],
      mod: "remove",
    };
  }
  if (intiN.length > intiO.length) {
    // Se añade un elemento
    return {
      x: intiN.length - 1,
      element: intiN[intiN.length - 1],
      mod: "add",
    };
  }
  if (intiO.length > intiN.length) {
    return {
      x: intiO.length - 1,
      element: intiO[intiO.length - 1],
      mod: "remove",
    };
  }

	// si tiene el mimsmo tamanio se comprueba cual a sido modificado
	// si la diferencia en el nuevo es un 0 es que se a borrado si la diferencia
	for(let i = 0; i < intiN.length; i++) {
		if (intiN[i] !== intiO[i]) {
			return {
				x: i,
				element: intiN[i],
				mod: "modify",
			};
		}
	}
};
