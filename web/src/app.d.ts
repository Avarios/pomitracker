// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
    interface Locals {
        debug: boolean,
        user: import('$lib/models').User|undefined
    }
}
