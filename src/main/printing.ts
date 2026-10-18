import type { WebContents } from 'electron'
import { UserError } from './errors'

/** Opens the system print dialog for the page. A cancelled dialog is not an error. */
export function printPage(webContents: WebContents): Promise<void> {
  return new Promise((resolve, reject) => {
    webContents.print({ silent: false, printBackground: false }, (success, failureReason) => {
      if (success || /cancel/i.test(failureReason)) resolve()
      else reject(new UserError(`Printing failed: ${failureReason || 'unknown reason'}`))
    })
  })
}
