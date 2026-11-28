import {requireWorkspacePage,scopedNewsroomEnabled,newsroomLocale} from '@/lib/services/newsroom-workspace';
import {
    redirect,
  } from 'next/navigation';
  
  import {
    getCurrentUser,
  } from '@/lib/auth/session';
  
  import {
    getDictionary,
  } from '@/lib/i18n/dictionaries';
  
  import {
    defaultLocale,
  } from '@/lib/i18n/config';
  
  import {
    getEditorialProfiles,
  } from '@/lib/services/editorial-profiles';
  
  import {
    AuthorManager,
  } from '@/components/editorial/authors/AuthorManager';
  
  export default async function AuthorsPage() {
    await requireWorkspacePage('manageBylines');
    const user = await getCurrentUser();
  
    const locale=await newsroomLocale(user);
  
    const dict =
      getDictionary(locale);
  
    if (!user) {
      return null;
    }
  
    if (
      !scopedNewsroomEnabled()&&!user.profile?.isEditor
    ) {
      redirect(
        '/newsroom'
      );
    }
  
    const authors =
      await getEditorialProfiles();
  
    return (
      <div
        className="
          mx-auto
          max-w-7xl
          px-6
          py-8
        "
      >
        <div
          className="
            border-b
            border-border
            pb-5
          "
        >
          <h1
            className="
              font-headline
              text-2xl
              font-bold
              text-deep
            "
          >
            {dict.newsroom.authors}
          </h1>
  
          <p
            className="
              mt-1
              text-sm
              text-muted-foreground
            "
          >
            {locale==='es'?'Administre las firmas, biografías, cargos y fotos de perfil.':'Manage author bylines, biographies, titles, and profile photos.'}
          </p>
        </div>
  
        <AuthorManager
          authors={authors}
          dict={dict}
          userId={user.id}
        />
      </div>
    );
  }