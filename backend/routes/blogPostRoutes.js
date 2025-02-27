import express from "express";
import BlogPost from "../models/BlogPost.js";
import cloudinaryUploader from "../config/claudinaryConfig.js"; // Import dell'uploader di Cloudinary
//import { sendEmail } from "../services/emailService.js"; // Import del servizio per l'invio delle mail
import { authMiddleware } from "../middlewares/authMiddleware.js"; // Middleware di autenticazione

const router = express.Router();

// GET /blogPosts: ritorna una lista di blog post
router.get("/", async (req, res) => {
  try {
    let query = {};
    // Se c'è un parametro 'title' nella query, crea un filtro per la ricerca case-insensitive
    if (req.query.title) {
      query.title = { $regex: req.query.title, $options: "i" }; // Per fare ricerca case-insensitive
    }
    // Cerca i blog post nel database usando il filtro (se presente)
    const blogPosts = await BlogPost.find(query);
    // Invia la lista dei blog post come risposta JSON
    res.json(blogPosts);
  } catch (err) {
    // In caso di errore, invia una risposta di errore
    res.status(500).json({ message: err.message });
  }
});

// GET /blogPosts/123: ritorna un singolo blog post
router.get("/:id", async (req, res) => {
  try {
    // Cerca un blog post specifico per ID
    const blogPost = await BlogPost.findById(req.params.id);
    if (!blogPost) {
      // Se il blog post non viene trovato, invia una risposta 404
      return res.status(404).json({ message: "Blog post non trovato" });
    }
    // Invia il blog post trovato come risposta JSON
    res.json(blogPost);
  } catch (err) {
    // In caso di errore, invia una risposta di errore
    res.status(500).json({ message: err.message });
  }
});

// Middleware di autenticazione per le rotte successive
router.use(authMiddleware);

// POST /blogPosts: crea un nuovo blog post con l'upload dell'immagine di copertura
router.post("/", authMiddleware, cloudinaryUploader.single("cover"), async (req, res) => {
  try {
    const postData = req.body;
    if (req.file) {
      postData.cover = req.file.path;
    }
    
    // Usa i dati dell'autore autenticato
    postData.author = `${req.author.nome} ${req.author.cognome}`;
    postData.authorEmail = req.author.email;

    const newPost = new BlogPost(postData);
    await newPost.save();

    // -- COMMENTATO PER NON DARE PROBLEMI ALLA CREAZIONE DEL POST
    // Invia una mail all'autore del post
    //     const htmlContent = `
    //       <h1>Il tuo post è stato pubblicato!</h1>
    //       <p>Ciao ${newPost.author},</p>
    //       <p>Il tuo post "${newPost.title}" è stato pubblicato con successo.</p>
    //       <p>Categoria: ${newPost.category}</p>
    //       <p>Grazie per il tuo contributo al blog!</p>
    //     `;

    //     await sendEmail(
    //       newPost.author, // Ovviamente assumendo che newPost.author sia l'email dell'autore
    //       "Il tuo post è stato correttamente pubblicato",
    //        htmlContent
    //     );

    res.status(201).json(newPost);
  } catch (error) {
    console.error("Errore durante la creazione del post:", error);
    // Gestisce eventuali errori durante la creazione del post
    res.status(400).json({ message: error.message });
  }
});

// PUT /blogPosts/123: modifica il blog post con l'id associato
router.put("/:id", async (req, res) => {
  try {
    // Trova e aggiorna il blog post nel database
    const updatedBlogPost = await BlogPost.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // Opzione per restituire il documento aggiornato
    );
    if (!updatedBlogPost) {
      // Se il blog post non viene trovato, invia una risposta 404
      return res.status(404).json({ message: "Blog post non trovato" });
    }
    // Invia il blog post aggiornato come risposta JSON
    res.json(updatedBlogPost);
  } catch (err) {
    // In caso di errore, invia una risposta di errore
    res.status(400).json({ message: err.message });
  }
});

// DELETE /blogPosts/123: cancella il blog post con l'id associato
router.delete("/:id", async (req, res) => {
  try {
    // Trova e elimina il blog post dal database
    const deletedBlogPost = await BlogPost.findByIdAndDelete(req.params.id);
    if (!deletedBlogPost) {
      // Se il blog post non viene trovato, invia una risposta 404
      return res.status(404).json({ message: "Blog post non trovato" });
    }
    // Invia un messaggio di conferma come risposta JSON
    res.json({ message: "Blog post eliminato" });
  } catch (err) {
    // In caso di errore, invia una risposta di errore
    res.status(500).json({ message: err.message });
  }
});

// PATCH /blogPosts/:blogPostId/cover: carica un'immagine di copertina per il post specificato
router.patch(
  "/:blogPostId/cover",
  cloudinaryUploader.single("cover"),
  async (req, res) => {
    try {
      // Verifica se è stato caricato un file
      if (!req.file) {
        return res.status(400).json({ message: "Ops, nessun file caricato" });
      }

      // Cerca il blog post nel database
      const blogPost = await BlogPost.findById(req.params.blogPostId);
      if (!blogPost) {
        return res.status(404).json({ message: "Blog post non trovato" });
      }

      // Aggiorna l'URL della copertina del post con l'URL fornito da Cloudinary
      blogPost.cover = req.file.path;

      // Salva le modifiche nel database
      await blogPost.save();

      // Invia la risposta con il blog post aggiornato
      res.json(blogPost);
    } catch (error) {
      // In caso di errore, invia una risposta di errore
      res.status(500).json({ message: "Errore interno del server" });
    }
  }
);

// GET /blogPosts/:id/comments => ritorna tutti i commenti di uno specifico post
router.get("/:id/comments", async (req, res) => {
  try {
    // Cerca il post nel database usando l'ID fornito
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      // Se il post non viene trovato, invia una risposta 404
      return res.status(404).json({ message: "Post non trovato" });
    }
    // Invia i commenti del post come risposta JSON
    res.json(post.comments);
  } catch (error) {
    // In caso di errore, invia una risposta di errore
    res.status(500).json({ message: error.message });
  }
});

// GET /blogPosts/:id/comments/:commentId => ritorna un commento specifico di un post specifico
router.get("/:id/comments/:commentId", async (req, res) => {
  try {
    // Cerca il post nel database usando l'ID fornito
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      // Se il post non viene trovato, invia una risposta 404
      return res.status(404).json({ message: "Post non trovato" });
    }
    // Cerca il commento specifico all'interno del post
    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      // Se il commento non viene trovato, invia una risposta 404
      return res.status(404).json({ message: "Commento non trovato" });
    }
    // Invia il commento trovato come risposta JSON
    res.json(comment);
  } catch (error) {
    // In caso di errore, invia una risposta di errore
    res.status(500).json({ message: error.message });
  }
});

// POST /blogPosts/:id/comments => aggiungi un nuovo commento ad un post specifico
router.post("/:id/comments", async (req, res) => {
  try {
    // Cerca il post nel database usando l'ID fornito
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      // Se il post non viene trovato, invia una risposta 404
      return res.status(404).json({ message: "Post non trovato" });
    }
    // Crea un nuovo oggetto commento con i dati forniti
    const newComment = {
      name: req.body.name,
      email: req.body.email,
      content: req.body.content,
    };
    // Aggiungi il nuovo commento all'array dei commenti del post
    post.comments.push(newComment);
    // Salva le modifiche nel database
    await post.save();
    // Invia il nuovo commento come risposta JSON con status 201 (Created)
    res.status(201).json(newComment);
  } catch (error) {
    // In caso di errore, invia una risposta di errore
    res.status(400).json({ message: error.message });
  }
});

// PUT /blogPosts/:id/comments/:commentId => cambia un commento di un post specifico
router.put("/:id/comments/:commentId", async (req, res) => {
  try {
    // Cerca il post nel database usando l'ID fornito
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      // Se il post non viene trovato, invia una risposta 404
      return res.status(404).json({ message: "Post non trovato" });
    }
    // Cerca il commento specifico all'interno del post
    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      // Se il commento non viene trovato, invia una risposta 404
      return res.status(404).json({ message: "Commento non trovato" });
    }
    // Aggiorna il contenuto del commento
    comment.content = req.body.content;
    // Salva le modifiche nel database
    await post.save();
    // Invia il commento aggiornato come risposta JSON
    res.json(comment);
  } catch (error) {
    // In caso di errore, invia una risposta di errore
    res.status(400).json({ message: error.message });
  }
});

// DELETE /blogPosts/:id/comments/:commentId => elimina un commento specifico da un post specifico
router.delete("/:id/comments/:commentId", async (req, res) => {
  try {
    // Cerca il post nel database usando l'ID fornito
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      // Se il post non viene trovato, invia una risposta 404
      return res.status(404).json({ message: "Post non trovato" });
    }
    // Cerca e rimuove il commento specifico all'interno del post
    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Commento non trovato" });
    }
    comment.remove();
    // Salva le modifiche nel database
    await post.save();
    // Invia un messaggio di conferma come risposta JSON
    res.json({ message: "Commento eliminato con successo" });
  } catch (error) {
    // In caso di errore, invia una risposta di errore
    res.status(500).json({ message: error.message });
  }
});

export default router;
