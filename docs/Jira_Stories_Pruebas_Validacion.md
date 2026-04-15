# JIRA - Épica: Pruebas y Validación
## Procesos: Login y Autenticación | Pedido

---

## ÉPICA: Pruebas y Validación

**Descripción:** Validación exhaustiva de los procesos críticos de la aplicación mediante pruebas funcionales, de rendimiento, accesibilidad y seguridad para asegurar la calidad del producto antes del despliegue.

---

### HISTORIA 1: Validación del Proceso de Login y Autenticación
**ID:** PROY-101  
**Asignado a:** Juan Arango  
**Tipo:** Story  
**Prioridad:** Alta  
**Story Points:** 8

**Descripción:**
Como usuario del sistema, necesito poder registrarme, iniciar sesión y recuperar mi contraseña de forma segura y eficiente, con una experiencia de usuario óptima y accesible.

**Criterios de Aceptación:**
- El formulario de registro valida correctamente todos los campos (nombre, email, username, contraseña)
- El login funciona con username y email
- La recuperación de contraseña envía email y permite reset
- El proceso cumple con métricas de rendimiento (FCP ≤ 3.0s, TBT ≤ 600ms)
- El formulario es accesible según WCAG 2.1 AA
- No hay vulnerabilidades de seguridad (mixed content, headers)

---

#### Subtareas PROY-101:

**PROY-101.1 - Pruebas funcionales de registro y login**
- [ ] Validar registro con datos correctos
- [ ] Validar registro con datos duplicados
- [ ] Validar login con username
- [ ] Validar login con email
- [ ] Validar login con credenciales incorrectas
- [ ] Verificar mensajes de error específicos en español
- [ ] Validar que la contraseña se almacena como hash en BD

**PROY-101.2 - Pruebas de flujo de recuperación de contraseña**
- [ ] Solicitar reset con email válido
- [ ] Verificar que se envía email de recuperación
- [ ] Validar enlace de reset expira correctamente
- [ ] Cambiar contraseña con token válido
- [ ] Rechazar reset con token inválido/expirado
- [ ] Verificar que nueva contraseña permite login

**PROY-101.3 - Pruebas de rendimiento con PageSpeed Insights**
- [ ] Ejecutar PageSpeed Insights en https://d2nkt7j19iaq1l.cloudfront.net
- [ ] Verificar FCP ≤ 3.0s (aceptable) o ≤ 1.8s (óptimo)
- [ ] Verificar TBT ≤ 600ms (aceptable) o ≤ 200ms (óptimo)
- [ ] Verificar CLS ≤ 0.25 (aceptable) o ≤ 0.1 (óptimo)
- [ ] Generar reporte de métricas actuales
- [ ] Documentar desviaciones si las hay

**PROY-101.4 - Pruebas de accesibilidad con WAVE**
- [ ] Ejecutar WAVE extensión Chrome en sección de login
- [ ] Verificar 0 errores críticos en campos de formulario
- [ ] Verificar ≤ 5 errores de contraste
- [ ] Verificar ≥ 10 features de accesibilidad (labels, ARIA)
- [ ] Validar navegación por teclado
- [ ] Validar lector de pantalla (simulado)

**PROY-101.5 - Pruebas de seguridad y buenas prácticas**
- [ ] Verificar Best Practices Score ≥ 70 en PageSpeed
- [ ] Confirmar 0 advertencias de mixed content
- [ ] Validar uso exclusivo de HTTPS
- [ ] Verificar headers de seguridad
- [ ] Confirmar limpieza de sesión al logout
- [ ] Validar expiración de tokens JWT (≤ 2h)

---

### HISTORIA 2: Validación del Proceso de Pedido
**ID:** PROY-102  
**Asignado a:** Juan Arias  
**Tipo:** Story  
**Prioridad:** Alta  
**Story Points:** 13

**Descripción:**
Como cliente, necesito navegar productos, agregar al carrito, completar el checkout y realizar el pago de forma segura, con buen rendimiento y accesibilidad, recibiendo confirmación de mi pedido.

**Criterios de Aceptación:**
- Los productos cargan correctamente con imágenes y precios
- El carrito persiste entre recargas de página
- El checkout prellena datos y valida correctamente
- El pago con Mercado Pago funciona sin almacenar datos de tarjeta
- El proceso cumple con métricas de rendimiento (LCP ≤ 4.0s, CLS ≤ 0.25)
- El formulario de checkout es accesible según WCAG 2.1 AA
- Se genera orden y se decrementa stock correctamente

---

#### Subtareas PROY-102:

**PROY-102.1 - Pruebas funcionales del catálogo y carrito**
- [ ] Verificar carga de productos con imágenes
- [ ] Validar agregar productos al carrito
- [ ] Validar modificar cantidad en carrito
- [ ] Validar eliminar productos del carrito
- [ ] Verificar persistencia del carrito tras recarga
- [ ] Validar expiración del carrito a 24h
- [ ] Verificar cálculo correcto de totales

**PROY-102.2 - Pruebas del flujo de checkout**
- [ ] Validar prefill automático de datos de usuario
- [ ] Validar selección dinámica de departamento → ciudad
- [ ] Validar campos requeridos del formulario
- [ ] Validar mensajes de error específicos
- [ ] Verificar cotización de envío en tiempo real
- [ ] Validar que no se permiten envíos duplicados (guard)

**PROY-102.3 - Pruebas de integración con Mercado Pago**
- [ ] Validar renderizado del Payment Brick
- [ ] Realizar pago con tarjeta de prueba (approved)
- [ ] Realizar pago con tarjeta rechazada (rejected)
- [ ] Verificar que no se almacenan datos de tarjeta
- [ ] Validar manejo de errores de pago sin perder datos
- [ ] Verificar generación de token y procesamiento

**PROY-102.4 - Pruebas de rendimiento con GTmetrix**
- [ ] Ejecutar GTmetrix en página de productos
- [ ] Verificar LCP ≤ 4.0s (aceptable) o ≤ 2.5s (óptimo)
- [ ] Verificar CLS ≤ 0.25 (aceptable) o ≤ 0.1 (óptimo)
- [ ] Verificar Total Page Size ≤ 5 MB
- [ ] Verificar Total Requests ≤ 60
- [ ] Validar Structure Score ≥ 50%

**PROY-102.5 - Pruebas de accesibilidad del checkout**
- [ ] Ejecutar WAVE en formulario de checkout
- [ ] Verificar 0 errores críticos en campos de dirección
- [ ] Verificar ≤ 5 errores de contraste en formulario
- [ ] Validar labels asociadas a todos los campos
- [ ] Verificar atributos ARIA correctos
- [ ] Validar navegación por tab entre campos

**PROY-102.6 - Pruebas de integridad de datos post-pedido**
- [ ] Verificar creación de orden con status 'confirmado'
- [ ] Validar decremento correcto de stock
- [ ] Verificar generación de StockMovement
- [ ] Validar envío de email de confirmación
- [ ] Verificar que el carrito se limpia tras pedido
- [ ] Validar que no hay pedidos duplicados

---

### HISTORIA 3: Validación de Métricas de Calidad y Documentación
**ID:** PROY-103  
**Asignado a:** Juan Arango  
**Tipo:** Story  
**Prioridad:** Media  
**Story Points:** 5

**Descripción:**
Como equipo de calidad, necesito validar que todas las métricas definidas en el Plan de Gestión de Calidad se puedan medir correctamente con las herramientas especificadas y documentar los resultados.

**Criterios de Aceptación:**
- Todas las métricas de negocio se pueden medir con MongoDB Compass/DevTools
- Todas las métricas de aplicación se pueden medir con PageSpeed/WAVE/GTmetrix
- Se genera reporte de estado actual vs umbrales definidos
- Se actualiza el Plan de Gestión de Calidad con resultados

---

#### Subtareas PROY-103:

**PROY-103.1 - Validación de métricas de negocio**
- [ ] Medir tasa de registro exitoso con MongoDB Compass
- [ ] Medir tasa de verificación de email
- [ ] Medir tasa de recuperación de contraseña
- [ ] Medir tasa de conversión carrito → pedido
- [ ] Medir tasa de pagos aprobados
- [ ] Calcular valor promedio del pedido

**PROY-103.2 - Validación de métricas de aplicación**
- [ ] Ejecutar suite completa de PageSpeed Insights
- [ ] Ejecutar análisis WAVE en login y checkout
- [ ] Ejecutar análisis GTmetrix completo
- [ ] Documentar scores actuales vs umbrales
- [ ] Identificar áreas de mejora prioritarias
- [ ] Generar reporte consolidado de calidad

**PROY-103.3 - Actualización de documentación**
- [ ] Actualizar Sección 4 con resultados reales
- [ ] Actualizar Sección 5 con resultados reales
- [ ] Actualizar tabla de cumplimiento de RNFs
- [ ] Generar resumen ejecutivo de calidad
- [ ] Preparar recomendaciones para mejora continua

---

## Notas de Asignación

**Juan Arango:** Historias enfocadas en validación de autenticación, seguridad y documentación de calidad
**Juan Arias:** Historia enfocada en validación del flujo completo de pedido y pago

**Total Story Points:** 26 (8 + 13 + 5)

---

## Dependencias

- PROY-101 debe completarse antes de PROY-103 (métricas de login)
- PROY-102 debe completarse antes de PROY-103 (métricas de pedido)
- Acceso a entorno de producción: https://d2nkt7j19iaq1l.cloudfront.net
- Acceso a MongoDB Atlas para métricas de negocio
- Cuentas de prueba en Mercado Pago para validación de pagos

---

## Criterios de Done

Para cada historia:
- Todas las subtareas completadas
- Evidencia documentada (screenshots, reportes)
- Métricas registradas en Plan de Gestión de Calidad
- Sin bloqueadores críticos identificados
- Pruebas ejecutadas en entorno de producción
