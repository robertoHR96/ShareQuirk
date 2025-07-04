# ShareQuirk - Frontend Principal (QCRAFT)

Este repositorio contiene el frontend completo de la plataforma QCRAFT, una herramienta colaborativa para el diseño de circuitos cuánticos. Está construido con React y se divide en dos componentes principales: la aplicación de gestión (QCRAFT) y el editor de circuitos (Quirk).

## Descripción General

ShareQuirk es la interfaz con la que interactúa el usuario. Permite gestionar circuitos, autenticarse y, lo más importante, acceder al editor visual para diseñar circuitos cuánticos de forma individual o colaborativa.

### Estructura del Proyecto

-   **Directorio Raíz (`/`):** Contiene la aplicación principal de QCRAFT. Esta parte gestiona:
    -   La autenticación de usuarios (usando Auth0).
    -   El panel de control "My Circuits", donde los usuarios pueden ver, guardar, renombrar y compartir sus circuitos.
    -   La comunicación con el backend de Django (`QuantumWeb`) para todas las operaciones de persistencia.
-   **Directorio `Quirk/`:** Contiene la versión modificada del editor de circuitos Quirk. Esta sub-aplicación es responsable de:
    -   La interfaz visual para arrastrar y soltar puertas cuánticas.
    -   La comunicación en tiempo real con el backend de Spring Boot (`quirkSpring`) a través de WebSockets para la edición colaborativa.

## Tecnologías Utilizadas

-   **Librería:** React
-   **Lenguaje:** JavaScript
-   **Autenticación:** Auth0
-   **Comunicación:** Fetch API (para REST), WebSockets (para tiempo real)

## Instrucciones de Ejecución

Este proyecto tiene dos partes que deben ejecutarse de forma independiente.

### 1. Interfaz Principal (QCRAFT - con Auth0)

Esta es la aplicación principal que gestiona los usuarios y los circuitos.

-   **Ubicación:** Directorio raíz del proyecto.
-   **Instalación:** `npm install`
-   **Ejecución:** `npm start`
-   **URL:** `http://localhost:3000`

### 2. Editor de Circuitos (Quirk)

Esta es la interfaz de edición visual.

-   **Ubicación:** Directorio `/Quirk`.
-   **Instalación:** `cd Quirk && npm install`
-   **Ejecución:** `npm run dev`
-   **Nota:** Este entorno se usa para probar y visualizar los circuitos en tiempo real.

Para una funcionalidad completa, los dos backends (`QuantumWeb` y `quirkSpring`) deben estar en ejecución.