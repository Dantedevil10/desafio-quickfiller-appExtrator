import { Component, ElementRef, ViewChild, signal, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DocumentoService } from './services/documento.service';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, HttpClientModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.sass'
})
export class App {
  protected readonly title = signal('quick-filler-interface');

  // Dois Canvas: Um para a tela de fundo, outro para a Modal
  @ViewChild('pdfCanvasMain', { static: false }) pdfCanvasMain?: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfCanvasModal', { static: false }) pdfCanvasModal?: ElementRef<HTMLCanvasElement>;

  arquivoSelecionado: File | null = null;
  mensagemProgresso: string = 'Preparando a leitura...';
  tipoSelecionado: string = 'cartao-ponto';
  formatoExportacao: string = 'xlsx';
  
  statusRequisicao: 'ocioso' | 'processando' | 'revisao' | 'erro' = 'ocioso';
  dadosExtraidos: any = { pages: [] };
  jobIdAtual: string | null = null;
  intervaloPolling: any;

  pdfDoc: any = null;
  paginaAtual: number = 1;
  totalPaginas: number = 0;
  valorPorcentagem: number = 0;

  mensagemErro: string = '';
  timeoutUpload: any;

  constructor(
    private docService: DocumentoService,
    private cdr: ChangeDetectorRef 
  ) {}

  async onFileChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const isPdfType = file.type === 'application/pdf';
    const isPdfExtension = file.name.toLowerCase().endsWith('.pdf');

    if (!isPdfType && !isPdfExtension) {
      alert('❌ Por favor, selecione apenas arquivos PDF válidos.');
      event.target.value = ''; 
      return;
    }

    const tamanhoMaximoBytes = 10 * 1024 * 1024;
    if (file.size > tamanhoMaximoBytes) {
      alert('❌ O arquivo é muito grande. O tamanho máximo permitido é 10 MB.');
      event.target.value = ''; 
      return;
    }

    this.arquivoSelecionado = file;
    this.paginaAtual = 1;
    this.cdr.detectChanges();

    const arrayBuffer = await file.arrayBuffer();
    this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    this.totalPaginas = this.pdfDoc.numPages;

    this.cdr.detectChanges();
    await this.renderizarPagina(this.paginaAtual);
  }

  // Renderiza sequencialmente em qualquer Canvas que esteja visível na tela
  async renderizarPagina(numPagina: number) {
    if (!this.pdfDoc) return;
    const page = await this.pdfDoc.getPage(numPagina);
    const viewport = page.getViewport({ scale: 1.3 });

    // 1. Tenta desenhar no Canvas da tela principal
    if (this.pdfCanvasMain && this.pdfCanvasMain.nativeElement) {
      const canvas = this.pdfCanvasMain.nativeElement;
      const ctx = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: ctx, viewport }).promise.catch(() => {});
    }

    // 2. Tenta desenhar no Canvas da Modal (se ela estiver aberta)
    if (this.pdfCanvasModal && this.pdfCanvasModal.nativeElement) {
      const canvas = this.pdfCanvasModal.nativeElement;
      const ctx = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: ctx, viewport }).promise.catch(() => {});
    }

    this.cdr.detectChanges();
  }

  // ==========================================
  // RASTREABILIDADE VISUAL (Pinta a palavra)
  // ==========================================
  async destacarNoPdf(valorProcurado: string | number) {
    if (!valorProcurado || !this.pdfDoc || String(valorProcurado).trim() === '') return;
    
    // 1. Redesenha para limpar marcações antigas
    await this.renderizarPagina(this.paginaAtual);

    // 2. Só pinta no Canvas da Modal, pois a edição ocorre lá
    if (!this.pdfCanvasModal?.nativeElement) return;
    
    const textoBusca = String(valorProcurado).replace(/[R$\s]/g, '').toLowerCase().trim();
    const page = await this.pdfDoc.getPage(this.paginaAtual);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.3 });
    
    const canvas = this.pdfCanvasModal.nativeElement;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(255, 235, 59, 0.4)'; // Amarelo translúcido
    ctx.strokeStyle = '#fbc02d';
    ctx.lineWidth = 2;

    textContent.items.forEach((item: any) => {
      if (item.str && item.str.replace(/\s/g, '').toLowerCase().includes(textoBusca)) {
        const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontHeight = Math.sqrt((transform[2] * transform[2]) + (transform[3] * transform[3]));
        const fontAscent = fontHeight * 0.8; 

        const x = transform[4];
        const y = transform[5] - fontAscent;
        const width = item.width * viewport.scale;
        const height = fontHeight * 1.2;

        ctx.fillRect(x, y - 2, width, height);
        ctx.strokeRect(x, y - 2, width, height);
      }
    });
  }
  // ==========================================
  // 
  // ==========================================

  paginaAnterior() {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
      this.renderizarPagina(this.paginaAtual);
    }
  }
  proximaPagina() {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
      this.renderizarPagina(this.paginaAtual);
    }
  }

  enviarDocumento() {
    if (!this.arquivoSelecionado) return alert('Selecione um arquivo!');

    this.statusRequisicao = 'processando';
    this.mensagemProgresso = 'Enviando arquivo para o servidor...'; 
    this.valorPorcentagem = 10;
    
    this.cdr.detectChanges();
    setTimeout(() => { this.renderizarPagina(this.paginaAtual); }, 100);

    // ==========================================
    // TRAVA DE SEGURANÇA: TIMEOUT DE 30 SEGUNDOS
    // ==========================================
    if (this.timeoutUpload) clearTimeout(this.timeoutUpload);
    this.timeoutUpload = setTimeout(() => {
      // Se depois de 30s ainda estiver tentando enviar (processando)
      if (this.statusRequisicao === 'processando') {
        this.mensagemErro = 'O servidor demorou muito para receber o arquivo (Timeout de 30s). Verifique sua conexão ou se o sistema está online.';
        this.statusRequisicao = 'erro';
        this.valorPorcentagem = 0;
        this.cdr.detectChanges();
      }
    }, 30000); // 30.000 ms = 30 segundos

    this.docService.uploadDocumento(this.arquivoSelecionado, this.tipoSelecionado)
      .subscribe({
        next: (res) => {
          // O SERVIDOR RESPONDEU! Mata o cronômetro na hora.
          if (this.timeoutUpload) clearTimeout(this.timeoutUpload);

          // Se a resposta chegou atrasada e o timeout já estourou a tela, ignora
          if (this.statusRequisicao === 'erro') return;

          this.jobIdAtual = res.id;
          this.iniciarPolling(); // Polling liberado para rodar o tempo que precisar
        },
        error: (err) => {
          // DEU ERRO DE REDE/CORS RÁPIDO! Mata o cronômetro na hora.
          if (this.timeoutUpload) clearTimeout(this.timeoutUpload);

          // Só substitui a mensagem de erro se o timeout já não tiver feito isso
          if (this.statusRequisicao === 'erro') return;

          console.error(err);
          this.mensagemErro = 'Não foi possível conectar ao servidor de extração.'; 
          this.statusRequisicao = 'erro';
          this.cdr.detectChanges();
        }
      });
  }

  iniciarPolling() {
    if (this.intervaloPolling) clearInterval(this.intervaloPolling);

    this.intervaloPolling = setInterval(() => {
      if (!this.jobIdAtual) return;

      this.docService.checkStatus(this.jobIdAtual).subscribe({
        next: (res) => {
          if (res.status === 'processando') {
            this.valorPorcentagem = 50;
            this.mensagemProgresso = res.mensagemProgresso || 'Lendo seu documento. Aguarde.';
            this.cdr.detectChanges();
          } 
          else if (res.status === 'concluido') {
            clearInterval(this.intervaloPolling);
            this.valorPorcentagem = 100;
            this.dadosExtraidos = res.value; 
            this.statusRequisicao = 'revisao';
            this.cdr.detectChanges(); 
          } 
          else if (res.status === 'erro') {
            clearInterval(this.intervaloPolling);
            // Salva o erro do backend na tela e muda o status SEM usar alert
            this.mensagemErro = res.erro || 'Falha na leitura do PDF.'; 
            this.statusRequisicao = 'erro';
            this.valorPorcentagem = 0;
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('Falha no polling', err);
          clearInterval(this.intervaloPolling);
          this.mensagemErro = 'O servidor parou de responder durante a leitura.'; // <- AVISO
          this.statusRequisicao = 'erro';
          this.cdr.detectChanges();
        }
      });
    }, 2000);
  }

  baixarArquivo() {
    if (!this.jobIdAtual) return;

    this.docService.salvarEdicoes(this.jobIdAtual, this.dadosExtraidos).subscribe({
      next: () => {
        this.docService.baixarPlanilha(this.jobIdAtual!, this.formatoExportacao).subscribe({
          next: (blob: Blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `extracao_${this.tipoSelecionado}.${this.formatoExportacao}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          },
          error: (err) => {
             alert('Erro ao gerar a exportação.');
          }
        });
      },
      error: (err) => {
         alert('Erro ao salvar suas correções antes de baixar.');
      }
    });
  }

  fecharModal() {
    if (this.intervaloPolling) clearInterval(this.intervaloPolling);
    this.statusRequisicao = 'ocioso';
    this.valorPorcentagem = 0;
    this.dadosExtraidos = { pages: [] };
    this.arquivoSelecionado = null
    
    // Quando fechar a Modal, garante que a tela principal não perca a renderização
    this.cdr.detectChanges();
    setTimeout(() => { this.renderizarPagina(this.paginaAtual); }, 100);
  }

  isLinhaAmarela(day: any): boolean {
    const punches = day?.punches || [];
    const temImpar = punches.length > 0 && punches.length % 2 !== 0;
    const estaVazio = punches.length === 0;
    const temIncerteza = (day?.date_raw || '').includes('?') || punches.some((p: any) => (p?.time_hhmm || '').includes('?'));
    return temImpar || estaVazio || temIncerteza;
  }

  isLinhaVermelha(daysList: any[], currentIndex: number): boolean {
    if (currentIndex === 0) return false;
    const atual = daysList[currentIndex]?.date_raw || '';
    const anterior = daysList[currentIndex - 1]?.date_raw || '';
    const matchAtual = atual.match(/^\s*(\d{1,2})\b/);
    const matchAnterior = anterior.match(/^\s*(\d{1,2})\b/);
    if (!matchAtual || !matchAnterior) return false;

    const diaAtual = parseInt(matchAtual[1], 10);
    const diaAnterior = parseInt(matchAnterior[1], 10);
    if (diaAtual !== diaAnterior + 1 && !(diaAnterior >= 28 && diaAtual === 1)) return true;
    return false;
  }

  obterCorFundo(daysList: any[], day: any, index: number): string {
    if (this.isLinhaVermelha(daysList, index)) return '#F8D7DA'; 
    if (this.isLinhaAmarela(day)) return '#FFF3CD'; 
    return '#fff';
  }

  obterBordaEsquerda(daysList: any[], index: number): string {
    if (this.isLinhaVermelha(daysList, index)) return '4px solid #DC3545';
    return 'none';
  }

  obterTituloErro(daysList: any[], day: any, index: number): string {
    if (this.isLinhaVermelha(daysList, index)) return 'Data não sequencial';
    const punches = day?.punches || [];
    if (punches.length > 0 && punches.length % 2 !== 0) return 'Batidas ímpares';
    if (punches.length === 0) return 'Dia sem registros';
    if ((day?.date_raw || '').includes('?')) return 'Dado incerto (?)';
    return '';
  }
}