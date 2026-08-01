/**
 * El backend SIEMPRE manda unidades enteras (90000 = $90.000 COP).
 * Aquí no se divide entre 100 nunca.
 *
 * Vive aparte del componente <Money> porque fast refresh no deja exportar
 * funciones y componentes desde el mismo archivo.
 */
export function money(v: number, code = 'COP') {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'COP' ? 0 : 2,
    }).format(v)
  } catch {
    // Un assetCode raro tira RangeError. Antes de tumbar la pantalla en
    // pleno demo, se muestra el número pelado con el código al lado.
    return `${new Intl.NumberFormat('es-CO').format(v)} ${code}`
  }
}
