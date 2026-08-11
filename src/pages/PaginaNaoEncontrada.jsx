import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

/**
 * 404 do Apsis Carbon. Renderiza em tela cheia, sem o shell, para não sugerir
 * navegação que talvez nem exista para o usuário. O único caminho oferecido é a
 * boas-vindas, de onde ele vê os módulos realmente liberados.
 */
export default function PaginaNaoEncontrada() {
  return (
    <div className="min-h-screen bg-[#F4F6F4] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-[#DDE3DE] rounded-2xl shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-[#F4F6F4] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Compass size={24} className="text-[#8A9990]" />
        </div>

        <p
          className="text-4xl font-black text-[#1A4731] tracking-tight"
          style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}
        >
          404
        </p>
        <h1 className="text-lg font-bold text-[#1A2B1F] mt-2">Página não encontrada</h1>
        <p className="text-sm text-[#5C7060] mt-2 leading-relaxed">
          O endereço acessado não existe ou o módulo ainda não foi liberado.
        </p>

        <Link
          to={createPageUrl('BoasVindas')}
          className="inline-flex items-center gap-2 bg-[#F47920] hover:bg-[#e06810] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm mt-6"
        >
          <ArrowLeft size={15} />
          Voltar para a Boas-Vindas
        </Link>
      </div>
    </div>
  );
}
