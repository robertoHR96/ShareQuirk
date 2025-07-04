# Editor de Circuitos Quirk Modificado

Esta es la versión adaptada del editor de circuitos cuánticos **Quirk**, que forma parte del frontend de la plataforma QCRAFT. Ha sido modificada para integrarse con un backend de WebSockets y permitir la colaboración en tiempo real.

## Descripción Técnica

Este componente es una aplicación React que proporciona la interfaz visual para el diseño de circuitos. Originalmente una herramienta para un solo usuario, ha sido intervenida para añadir una capa de comunicación que sincroniza las acciones entre múltiples usuarios.

### Funcionalidades Clave

-   **Editor Visual:** Interfaz de arrastrar y soltar (drag-and-drop) para construir circuitos cuánticos.
-   **Integración Colaborativa:** Se conecta al backend `quirkSpring` a través de WebSockets.
-   **Sincronización de Acciones:**
    -   Envía cada modificación (añadir, mover o eliminar puerta) al servidor WebSocket.
    -   Recibe actualizaciones del servidor y las refleja en la interfaz para mantener la consistencia entre todos los clientes.
    -   Gestiona la sincronización del historial (undo/redo) y el estado inicial de los cúbits.
-   **Modo Offline:** Si la conexión con el servidor WebSocket falla, la lógica local se restaura temporalmente para no bloquear al usuario.

## Prerrequisitos

-   Node.js
-   npm

## Instalación

Navega a este directorio desde la raíz del proyecto `ShareQuirk` y ejecuta:

```bash
npm install
```

## Ejecución para Desarrollo

Para iniciar el servidor de desarrollo de esta parte del proyecto, ejecuta:

```bash
npm run dev
```

Este comando levantará el entorno necesario para probar y visualizar los circuitos en tiempo real, tal y como se describe en el manual del TFG.

## Contexto del Proyecto

Este editor no está diseñado para funcionar de forma totalmente aislada. Es un componente clave del frontend `ShareQuirk` y depende del backend `quirkSpring` para su funcionalidad colaborativa. La aplicación principal de QCRAFT (en el directorio raíz) es la que normalmente carga esta interfaz.