<script lang="ts">
  import { AppBar } from "$lib/components";
  import type { PageData } from "./$types";
  export let data: PageData;
</script>

<header>
  <AppBar
    CognitoClientId={data.CognitoClientId}
    CognitoOauth2Url={data.CognitoUrl}
    User={data.user}
  />
</header>
<main>
  <slot />
</main>
